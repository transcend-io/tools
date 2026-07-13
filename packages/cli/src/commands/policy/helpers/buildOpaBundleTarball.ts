import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

import fg from 'fast-glob';

import { MAX_BUNDLE_COMPRESSED_BYTES, MAX_BUNDLE_DECOMPRESSED_BYTES } from '../constants.js';
import { assertOpaInstalled } from './assertOpaInstalled.js';
import { runOPACapture } from './runOpa.js';

/**
 * Returns whether a relative path is a publishable Rego policy file.
 *
 * OPA test files (`*_test.rego`) are excluded because they are for local
 * validation only and are not part of the upload contract.
 *
 * @param relativePath - Path relative to the bundle directory
 * @returns Whether the file should be included in the upload archive
 */
function isPublishableRegoFile(relativePath: string): boolean {
  return relativePath.endsWith('.rego') && !relativePath.endsWith('_test.rego');
}

/** Shape of the OPA bundle `manifest.json` as accepted by the Policy Engine. */
interface PolicyBundleManifest {
  /** Roots of the bundle, e.g. `["policy_engine"]` or `["policy_engine/transcend"]` */
  roots: string[];
}

/**
 * Reads and validates `manifest.json` from a policy bundle directory.
 *
 * The Policy Engine requires `manifest.json` to declare `roots` as an array of
 * strings. OPA's own tooling does not always enforce this against the Rego
 * packages on upload, so we validate the shape client-side to surface a clear,
 * actionable error instead of an opaque server `400` or a decide-time
 * fail-closed footgun.
 *
 * @param dir - Absolute path to the policy bundle directory
 * @returns The parsed manifest
 */
function readPolicyBundleManifest(dir: string): PolicyBundleManifest {
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Policy bundle directory must contain a manifest.json file.');
  }

  const raw = fs.readFileSync(manifestPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `manifest.json is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('manifest.json must contain a JSON object.');
  }

  const roots = (parsed as { roots?: unknown }).roots;
  if (!Array.isArray(roots) || roots.length === 0) {
    throw new Error(
      'manifest.json must declare "roots" as a non-empty array of strings (e.g. {"roots":["policy_engine"]}).',
    );
  }

  if (!roots.every((root) => typeof root === 'string' && root.length > 0)) {
    throw new Error('manifest.json "roots" must be an array of non-empty strings.');
  }

  return { roots };
}

/** Result of collecting publishable entries from a policy bundle directory. */
interface PolicyBundleArchiveContents {
  /** Relative paths to include in the upload tarball (manifest first, then rego) */
  entries: string[];
  /** Parsed manifest */
  manifest: PolicyBundleManifest;
}

/**
 * Collects `manifest.json` and publishable `.rego` files from a policy directory.
 *
 * @param dir - Absolute path to the policy bundle directory
 * @returns Archive entries and the parsed manifest
 */
function collectPolicyBundleArchiveEntries(dir: string): PolicyBundleArchiveContents {
  const manifest = readPolicyBundleManifest(dir);

  const regoFiles = fg
    .sync('**/*.rego', {
      cwd: dir,
      onlyFiles: true,
      dot: false,
    })
    .filter(isPublishableRegoFile);

  if (regoFiles.length === 0) {
    throw new Error('Policy bundle directory must contain at least one .rego policy file.');
  }

  return { entries: ['manifest.json', ...regoFiles.sort()], manifest };
}

/** Matches a Rego `package <path>` declaration. */
const PACKAGE_DECLARATION_PATTERN = /^\s*package\s+([A-Za-z_][\w.]*)/m;

/**
 * Normalizes an OPA manifest root to a dotted package prefix.
 *
 * Roots use `/` as the path separator (e.g. `policy_engine/transcend`); Rego
 * package paths use `.` (e.g. `policy_engine.transcend`).
 *
 * @param root - A manifest root string
 * @returns The root in dotted form
 */
function normalizeRootToPackagePrefix(root: string): string {
  return root.replace(/\//g, '.');
}

/**
 * Reads the Rego package path declared in a `.rego` file.
 *
 * @param filePath - Absolute path to the `.rego` file
 * @returns The dotted package path, or `undefined` if no `package` declaration
 */
function readRegoPackagePath(filePath: string): string | undefined {
  const contents = fs.readFileSync(filePath, 'utf8');
  const match = PACKAGE_DECLARATION_PATTERN.exec(contents);
  return match?.[1];
}

/**
 * Verifies that every publishable `.rego` package is covered by a manifest root.
 *
 * A bundle whose `roots` do not cover its Rego packages will upload cleanly but
 * fail-closed at decide time — the customer only discovers the mismatch via
 * denied decisions. This surfaces the mismatch at upload with a clear message.
 *
 * @param dir - Absolute path to the policy bundle directory
 * @param regoFiles - Relative paths to publishable `.rego` files
 * @param roots - Manifest roots
 */
function assertRootsCoverPackages(dir: string, regoFiles: string[], roots: string[]): void {
  const rootPrefixes = roots.map(normalizeRootToPackagePrefix);

  const uncovered: string[] = [];
  for (const relativeRego of regoFiles) {
    const pkg = readRegoPackagePath(path.join(dir, relativeRego));
    if (!pkg) {
      continue;
    }
    const covered = rootPrefixes.some((prefix) => pkg === prefix || pkg.startsWith(`${prefix}.`));
    if (!covered) {
      uncovered.push(
        `  - ${relativeRego} (package ${pkg}) is not covered by roots [${roots.join(', ')}]`,
      );
    }
  }

  if (uncovered.length > 0) {
    throw new Error(
      [
        'manifest.json "roots" do not cover all Rego packages in the bundle; ' +
          'uncovered packages will fail-closed at decide time. Either broaden "roots" or move the policy under a covered package:',
        ...uncovered,
      ].join('\n'),
    );
  }
}

/**
 * Verifies that a policy directory compiles end-to-end with `opa build`.
 *
 * The compiled output is discarded — the server receives the `manifest.json` +
 * `.rego` archive produced by {@link buildOpaBundleTarball}, not the OPA bundle
 * — but a successful build guarantees the policies compile and link, surfacing
 * errors (syntax, missing imports, undefined references, etc.) before upload.
 *
 * @param dir - Absolute path to the policy bundle directory
 */
async function assertBundleCompiles(dir: string): Promise<void> {
  const buildOutputPath = path.join(
    os.tmpdir(),
    `transcend-policy-bundle-build-${Date.now()}-${Math.random().toString(36).slice(2)}.tar.gz`,
  );
  try {
    // Run with `cwd` set to the bundle directory and pass `.` so `opa build`
    // resolves the bundle root correctly. `*_test.rego` files are local-only.
    const { code, stderr } = await runOPACapture(
      ['build', '--v0-compatible', '--ignore', '*_test.rego', '-o', buildOutputPath, '.'],
      { cwd: dir },
    );
    if (code !== 0) {
      throw new Error(stderr.trim() || `opa build failed with exit code ${code}`);
    }
  } finally {
    if (fs.existsSync(buildOutputPath)) {
      fs.unlinkSync(buildOutputPath);
    }
  }
}

/**
 * Formats a byte count as a human-readable size with binary units.
 *
 * @param bytes - Number of bytes
 * @returns Human-readable size, e.g. `14 MiB` or `4 KiB`
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kib = bytes / 1024;
  if (kib < 1024) {
    return `${kib % 1 === 0 ? kib.toFixed(0) : kib.toFixed(1)} KiB`;
  }
  const mib = kib / 1024;
  return `${mib % 1 === 0 ? mib.toFixed(0) : mib.toFixed(1)} MiB`;
}

/**
 * Builds a gzip-compressed policy bundle tarball for upload to Transcend.
 *
 * The Policy Engine API expects a plain archive containing `manifest.json` and
 * one or more `.rego` files. This differs from `opa build` output, which embeds
 * `.manifest`, `data.json`, and other OPA bundle metadata that the server
 * rejects. Before packaging, the manifest is validated (shape + root coverage)
 * and the bundle is validated with `opa check` (strict Rego linting) and
 * `opa build` (full compilation) so failures surface client-side rather than
 * after upload.
 *
 * @param dir - Directory containing `manifest.json` and `.rego` policy files
 * @returns Absolute path to the generated `.tar.gz` bundle
 */
export async function buildOpaBundleTarball(dir: string): Promise<string> {
  assertOpaInstalled();

  const resolvedDir = path.resolve(dir);
  if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
    throw new Error(`Policy directory does not exist or is not a directory: ${resolvedDir}`);
  }

  // Validate the manifest shape and that roots cover every Rego package before
  // invoking OPA, so invalid manifests surface a clear error instead of an
  // opaque `opa build failed with exit code 1`.
  const { entries: archiveEntries, manifest } = collectPolicyBundleArchiveEntries(resolvedDir);
  const regoFiles = archiveEntries.filter((entry) => entry !== 'manifest.json');
  assertRootsCoverPackages(resolvedDir, regoFiles, manifest.roots);

  // Match the Rego v1 validation the Policy Engine API runs on upload.
  const { code: checkCode, stderr: checkStderr } = await runOPACapture([
    'check',
    '--strict',
    '--v0-compatible',
    resolvedDir,
  ]);
  if (checkCode !== 0) {
    throw new Error(checkStderr.trim() || `opa check failed with exit code ${checkCode}`);
  }

  // Ensure the bundle compiles end-to-end before packaging for upload.
  await assertBundleCompiles(resolvedDir);

  const outputPath = path.join(
    os.tmpdir(),
    `transcend-policy-bundle-${Date.now()}-${Math.random().toString(36).slice(2)}.tar.gz`,
  );

  const tarResult = spawnSync('tar', ['-czf', outputPath, '-C', resolvedDir, ...archiveEntries], {
    env: { ...process.env, COPYFILE_DISABLE: '1' },
    encoding: 'utf8',
  });
  if (tarResult.status !== 0) {
    throw new Error(
      `Failed to create policy bundle archive: ${tarResult.stderr.trim() || 'tar failed'}`,
    );
  }

  const compressedBytes = fs.readFileSync(outputPath);
  if (compressedBytes.byteLength > MAX_BUNDLE_COMPRESSED_BYTES) {
    fs.unlinkSync(outputPath);
    throw new Error(
      `Policy bundle exceeds the ${formatBytes(MAX_BUNDLE_COMPRESSED_BYTES)} compressed upload limit ` +
        `(bundle is ${formatBytes(compressedBytes.byteLength)}). ` +
        `The server also rejects decompressed bundles larger than ${formatBytes(MAX_BUNDLE_DECOMPRESSED_BYTES)}.`,
    );
  }

  const decompressedBytes = gunzipSync(compressedBytes);
  if (decompressedBytes.byteLength > MAX_BUNDLE_DECOMPRESSED_BYTES) {
    fs.unlinkSync(outputPath);
    throw new Error(
      `Policy bundle exceeds the ${formatBytes(MAX_BUNDLE_DECOMPRESSED_BYTES)} decompressed upload limit ` +
        `(bundle is ${formatBytes(decompressedBytes.byteLength)} decompressed).`,
    );
  }

  return outputPath;
}
