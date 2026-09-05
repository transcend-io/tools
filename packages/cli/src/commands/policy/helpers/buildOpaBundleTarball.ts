import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

import fg from 'fast-glob';

import { MAX_BUNDLE_COMPRESSED_BYTES, MAX_BUNDLE_DECOMPRESSED_BYTES } from '../constants.js';
import { assertOpaInstalled } from './assertOpaInstalled.js';
import { runOPACapture, type RunOpaCaptureResult, type RunOpaOptions } from './runOpa.js';

/** OPA operations used while validating a policy bundle. */
export interface OpaBundleRuntime {
  /** Ensure that the OPA CLI is available. */
  readonly assertInstalled: () => void;
  /** Invoke OPA and capture its output. */
  readonly runCapture: (args: string[], options?: RunOpaOptions) => Promise<RunOpaCaptureResult>;
}

/** Runtime dependencies used to build a policy bundle tarball. */
export interface BuildOpaBundleTarballDependencies {
  /** Filesystem operations used to inspect and package policy files. */
  readonly fs: Pick<typeof fs, 'existsSync' | 'readFileSync' | 'statSync' | 'unlinkSync'>;
  /** Path operations used to resolve policy and temporary paths. */
  readonly path: Pick<typeof path, 'join' | 'resolve'>;
  /** Operating system operations used to locate temporary storage. */
  readonly os: Pick<typeof os, 'tmpdir'>;
  /** Environment variables passed to the tar process. */
  readonly env: NodeJS.ProcessEnv;
  /** Synchronous child process launcher used to create the tar archive. */
  readonly tarSpawnSync: typeof spawnSync;
  /** Glob implementation used to discover Rego files. */
  readonly fastGlob: Pick<typeof fg, 'sync'>;
  /** Gzip implementation used to enforce the decompressed size limit. */
  readonly gunzipSync: typeof gunzipSync;
  /** OPA runtime used to validate and compile the bundle. */
  readonly opa: OpaBundleRuntime;
}

const defaultDependencies: BuildOpaBundleTarballDependencies = {
  fs,
  path,
  os,
  env: process.env,
  tarSpawnSync: spawnSync,
  fastGlob: fg,
  gunzipSync,
  opa: {
    assertInstalled: assertOpaInstalled,
    runCapture: runOPACapture,
  },
};

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
 * @param dependencies - Runtime dependencies used to read the manifest
 * @returns The parsed manifest
 */
function readPolicyBundleManifest(
  dir: string,
  dependencies: BuildOpaBundleTarballDependencies,
): PolicyBundleManifest {
  const manifestPath = dependencies.path.join(dir, 'manifest.json');
  if (!dependencies.fs.existsSync(manifestPath)) {
    throw new Error('Policy bundle directory must contain a manifest.json file.');
  }

  const raw = dependencies.fs.readFileSync(manifestPath, 'utf8');
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
 * @param dependencies - Runtime dependencies used to discover bundle entries
 * @returns Archive entries and the parsed manifest
 */
function collectPolicyBundleArchiveEntries(
  dir: string,
  dependencies: BuildOpaBundleTarballDependencies,
): PolicyBundleArchiveContents {
  const manifest = readPolicyBundleManifest(dir, dependencies);

  const regoFiles = dependencies.fastGlob
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
 * @param dependencies - Runtime dependencies used to read the policy file
 * @returns The dotted package path, or `undefined` if no `package` declaration
 */
function readRegoPackagePath(
  filePath: string,
  dependencies: BuildOpaBundleTarballDependencies,
): string | undefined {
  const contents = dependencies.fs.readFileSync(filePath, 'utf8');
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
 * @param dependencies - Runtime dependencies used to read policy files
 */
function assertRootsCoverPackages(
  dir: string,
  regoFiles: string[],
  roots: string[],
  dependencies: BuildOpaBundleTarballDependencies,
): void {
  const rootPrefixes = roots.map(normalizeRootToPackagePrefix);

  const uncovered: string[] = [];
  for (const relativeRego of regoFiles) {
    const pkg = readRegoPackagePath(dependencies.path.join(dir, relativeRego), dependencies);
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
 * @param dependencies - Runtime dependencies used to compile the bundle
 */
async function assertBundleCompiles(
  dir: string,
  dependencies: BuildOpaBundleTarballDependencies,
): Promise<void> {
  const buildOutputPath = dependencies.path.join(
    dependencies.os.tmpdir(),
    `transcend-policy-bundle-build-${Date.now()}-${Math.random().toString(36).slice(2)}.tar.gz`,
  );
  try {
    // Run with `cwd` set to the bundle directory and pass `.` so `opa build`
    // resolves the bundle root correctly. `*_test.rego` files are local-only.
    const { code, stderr } = await dependencies.opa.runCapture(
      ['build', '--v0-compatible', '--ignore', '*_test.rego', '-o', buildOutputPath, '.'],
      { cwd: dir },
    );
    if (code !== 0) {
      throw new Error(stderr.trim() || `opa build failed with exit code ${code}`);
    }
  } finally {
    if (dependencies.fs.existsSync(buildOutputPath)) {
      dependencies.fs.unlinkSync(buildOutputPath);
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
 * @param dependencies - Runtime dependencies used to build the archive
 * @returns Absolute path to the generated `.tar.gz` bundle
 */
export async function buildOpaBundleTarball(
  dir: string,
  dependencies: BuildOpaBundleTarballDependencies = defaultDependencies,
): Promise<string> {
  dependencies.opa.assertInstalled();

  const resolvedDir = dependencies.path.resolve(dir);
  if (
    !dependencies.fs.existsSync(resolvedDir) ||
    !dependencies.fs.statSync(resolvedDir).isDirectory()
  ) {
    throw new Error(`Policy directory does not exist or is not a directory: ${resolvedDir}`);
  }

  // Validate the manifest shape and that roots cover every Rego package before
  // invoking OPA, so invalid manifests surface a clear error instead of an
  // opaque `opa build failed with exit code 1`.
  const { entries: archiveEntries, manifest } = collectPolicyBundleArchiveEntries(
    resolvedDir,
    dependencies,
  );
  const regoFiles = archiveEntries.filter((entry) => entry !== 'manifest.json');
  assertRootsCoverPackages(resolvedDir, regoFiles, manifest.roots, dependencies);

  // Match the Rego v1 validation the Policy Engine API runs on upload.
  const { code: checkCode, stderr: checkStderr } = await dependencies.opa.runCapture([
    'check',
    '--strict',
    '--v0-compatible',
    resolvedDir,
  ]);
  if (checkCode !== 0) {
    throw new Error(checkStderr.trim() || `opa check failed with exit code ${checkCode}`);
  }

  // Ensure the bundle compiles end-to-end before packaging for upload.
  await assertBundleCompiles(resolvedDir, dependencies);

  const outputPath = dependencies.path.join(
    dependencies.os.tmpdir(),
    `transcend-policy-bundle-${Date.now()}-${Math.random().toString(36).slice(2)}.tar.gz`,
  );

  const tarResult = dependencies.tarSpawnSync(
    'tar',
    ['-czf', outputPath, '-C', resolvedDir, ...archiveEntries],
    {
      env: { ...dependencies.env, COPYFILE_DISABLE: '1' },
      encoding: 'utf8',
    },
  );
  if (tarResult.status !== 0) {
    throw new Error(
      `Failed to create policy bundle archive: ${tarResult.stderr.trim() || 'tar failed'}`,
    );
  }

  const compressedBytes = dependencies.fs.readFileSync(outputPath);
  if (compressedBytes.byteLength > MAX_BUNDLE_COMPRESSED_BYTES) {
    dependencies.fs.unlinkSync(outputPath);
    throw new Error(
      `Policy bundle exceeds the ${formatBytes(MAX_BUNDLE_COMPRESSED_BYTES)} compressed upload limit ` +
        `(bundle is ${formatBytes(compressedBytes.byteLength)}). ` +
        `The server also rejects decompressed bundles larger than ${formatBytes(MAX_BUNDLE_DECOMPRESSED_BYTES)}.`,
    );
  }

  const decompressedBytes = dependencies.gunzipSync(compressedBytes);
  if (decompressedBytes.byteLength > MAX_BUNDLE_DECOMPRESSED_BYTES) {
    dependencies.fs.unlinkSync(outputPath);
    throw new Error(
      `Policy bundle exceeds the ${formatBytes(MAX_BUNDLE_DECOMPRESSED_BYTES)} decompressed upload limit ` +
        `(bundle is ${formatBytes(decompressedBytes.byteLength)} decompressed).`,
    );
  }

  return outputPath;
}
