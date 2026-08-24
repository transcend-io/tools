import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

import fg from 'fast-glob';

import { MAX_BUNDLE_COMPRESSED_BYTES, MAX_BUNDLE_DECOMPRESSED_BYTES } from './constants.js';

/**
 * Returns whether a relative path is a publishable Rego policy file.
 *
 * @param relativePath - Path relative to the bundle directory
 * @returns Whether the file should be included in the upload archive
 */
function isPublishableRegoFile(relativePath: string): boolean {
  return relativePath.endsWith('.rego') && !relativePath.endsWith('_test.rego');
}

/** Shape of the OPA bundle `manifest.json` as accepted by the Policy Engine. */
interface PolicyBundleManifest {
  /** Roots of the bundle, e.g. `["policy_engine"]` */
  roots: string[];
}

/**
 * Reads and validates `manifest.json` from a policy bundle directory.
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
  /** Relative paths to include in the upload tarball */
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
      ['manifest.json "roots" do not cover all Rego packages in the bundle:', ...uncovered].join(
        '\n',
      ),
    );
  }
}

/**
 * Formats a byte count as a human-readable size with binary units.
 *
 * @param bytes - Number of bytes
 * @returns Human-readable size
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
 * Rejects absolute paths and `..` segments so materialization cannot escape the staging dir.
 *
 * @param relativePath - Caller-supplied relative path key
 */
export function assertSafePolicyBundleRelativePath(relativePath: string): void {
  if (!relativePath || relativePath.trim().length === 0) {
    throw new Error('Policy bundle file paths must be non-empty relative paths.');
  }

  if (path.isAbsolute(relativePath)) {
    throw new Error(`Policy bundle file path must be relative, got: ${relativePath}`);
  }

  const normalized = path.posix.normalize(relativePath.replace(/\\/g, '/'));
  if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new Error(`Policy bundle file path must not contain "..": ${relativePath}`);
  }
}

/**
 * Writes an in-memory path→content map to a fresh temp directory.
 *
 * Callers must delete the returned directory when finished (typically after packing).
 *
 * @param files - Relative path → file contents (same shape as policy_help templateFiles.files)
 * @returns Absolute path to the staging directory
 */
export function materializePolicyBundleFiles(files: Record<string, string>): string {
  const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transcend-policy-files-'));
  const stagingRoot = path.resolve(stagingDir);

  try {
    for (const [relativePath, content] of Object.entries(files)) {
      assertSafePolicyBundleRelativePath(relativePath);
      const filePath = path.resolve(stagingDir, relativePath);
      if (filePath !== stagingRoot && !filePath.startsWith(`${stagingRoot}${path.sep}`)) {
        throw new Error(`Policy bundle file path escapes staging directory: ${relativePath}`);
      }
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf8');
    }
    return stagingDir;
  } catch (error) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Builds a gzip-compressed policy bundle tarball for upload to Transcend.
 *
 * Unlike the CLI `transcend policy publish` path, this does **not** invoke the
 * local `opa` binary. The monolith validates Rego on upload via
 * `validatePolicyBundleRego`.
 *
 * @param dir - Directory containing `manifest.json` and `.rego` policy files
 * @returns Absolute path to the generated `.tar.gz` bundle
 */
export async function packPolicyBundleTarball(dir: string): Promise<string> {
  const resolvedDir = path.resolve(dir);
  if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
    throw new Error(`Policy directory does not exist or is not a directory: ${resolvedDir}`);
  }

  const { entries: archiveEntries, manifest } = collectPolicyBundleArchiveEntries(resolvedDir);
  const regoFiles = archiveEntries.filter((entry) => entry !== 'manifest.json');
  assertRootsCoverPackages(resolvedDir, regoFiles, manifest.roots);

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
        `(bundle is ${formatBytes(compressedBytes.byteLength)}).`,
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

/**
 * Materializes an in-memory file map, packs it, then removes the staging directory.
 *
 * Non-publishable extras (e.g. `sample-input.json`) may be present; only
 * `manifest.json` and publishable `.rego` files are archived.
 *
 * @param files - Relative path → file contents
 * @returns Absolute path to the generated `.tar.gz` bundle
 */
export async function packPolicyBundleTarballFromFiles(
  files: Record<string, string>,
): Promise<string> {
  const stagingDir = materializePolicyBundleFiles(files);
  try {
    return await packPolicyBundleTarball(stagingDir);
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
}
