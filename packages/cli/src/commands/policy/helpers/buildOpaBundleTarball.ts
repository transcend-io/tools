import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

import fg from 'fast-glob';

import { validatePolicyBundleContents } from '../../../lib/policy/policy-bundle-manifest.js';
import {
  POLICY_MANIFEST_FILENAME,
  POLICY_UPLOAD_MANIFEST_FILENAME,
} from '../../../lib/policy/policy-scaffold-templates.js';
import { MAX_BUNDLE_COMPRESSED_BYTES, MAX_BUNDLE_DECOMPRESSED_BYTES } from '../constants.js';
import { assertOpaInstalled } from './assertOpaInstalled.js';
import { runOPACapture } from './runOpa.js';

/** Result of collecting publishable entries from a policy bundle directory. */
interface PolicyBundleArchiveContents {
  /** Relative paths to include in the upload tarball (manifest first, then rego) */
  entries: string[];
  /** Absolute path of the on-disk `.manifest` to copy into the archive as `manifest.json` */
  onDiskManifestPath: string;
}

/**
 * Collects `.manifest` and publishable `.rego` files from a policy directory.
 *
 * @param dir - Absolute path to the policy bundle directory
 * @returns Validated archive entries
 */
function collectPolicyBundleArchiveEntries(dir: string): PolicyBundleArchiveContents {
  const regoFiles = fg
    .sync('**/*.rego', {
      cwd: dir,
      onlyFiles: true,
      dot: false,
    })
    .sort();
  const onDiskManifestPath = path.join(dir, POLICY_MANIFEST_FILENAME);
  const { publishableRegoPaths } = validatePolicyBundleContents(
    fs.existsSync(onDiskManifestPath) ? fs.readFileSync(onDiskManifestPath, 'utf8') : undefined,
    regoFiles.map((relativePath) => ({
      path: relativePath,
      contents: fs.readFileSync(path.join(dir, relativePath), 'utf8'),
    })),
  );

  return {
    entries: [POLICY_UPLOAD_MANIFEST_FILENAME, ...publishableRegoPaths],
    onDiskManifestPath,
  };
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
    // resolves the bundle root correctly. Bundle mode (`-b`) keeps local
    // `input.json` / `input.example.json` fixtures from merging as data.
    // `*_test.rego` files are local-only.
    const { code, stderr } = await runOPACapture(
      ['build', '--v0-compatible', '--ignore', '*_test.rego', '-b', '-o', buildOutputPath, '.'],
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
 * one or more `.rego` files. Local projects author an OPA `.manifest`; this
 * helper renames it to `manifest.json` in the upload archive. Before packaging,
 * the manifest is validated (shape + root coverage) and the bundle is validated
 * with `opa check` (strict Rego linting) and `opa build` (full compilation) so
 * failures surface client-side rather than after upload.
 *
 * @param dir - Directory containing `.manifest` and `.rego` policy files
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
  const { entries: archiveEntries, onDiskManifestPath } =
    collectPolicyBundleArchiveEntries(resolvedDir);

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
  const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transcend-policy-bundle-stage-'));

  try {
    fs.copyFileSync(onDiskManifestPath, path.join(stagingDir, POLICY_UPLOAD_MANIFEST_FILENAME));
    for (const relativePath of archiveEntries.slice(1)) {
      const destination = path.join(stagingDir, relativePath);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(resolvedDir, relativePath), destination);
    }

    const tarResult = spawnSync('tar', ['-czf', outputPath, '-C', stagingDir, ...archiveEntries], {
      env: { ...process.env, COPYFILE_DISABLE: '1' },
      encoding: 'utf8',
    });
    if (tarResult.status !== 0) {
      throw new Error(
        `Failed to create policy bundle archive: ${tarResult.stderr.trim() || 'tar failed'}`,
      );
    }
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
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
