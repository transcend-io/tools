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

/**
 * Collects `manifest.json` and publishable `.rego` files from a policy directory.
 *
 * @param dir - Absolute path to the policy bundle directory
 * @returns Relative paths to include in the upload tarball
 */
function collectPolicyBundleArchiveEntries(dir: string): string[] {
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Policy bundle directory must contain a manifest.json file.');
  }

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

  return ['manifest.json', ...regoFiles.sort()];
}

/**
 * Builds a gzip-compressed policy bundle tarball for upload to Transcend.
 *
 * The Policy Engine API expects a plain archive containing `manifest.json` and
 * one or more `.rego` files. This differs from `opa build` output, which embeds
 * `.manifest`, `data.json`, and other OPA bundle metadata that the server
 * rejects.
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

  const archiveEntries = collectPolicyBundleArchiveEntries(resolvedDir);
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
      `Policy bundle exceeds the ${MAX_BUNDLE_COMPRESSED_BYTES} byte compressed upload limit (${compressedBytes.byteLength} bytes). ` +
        `The server also rejects decompressed bundles larger than ${MAX_BUNDLE_DECOMPRESSED_BYTES} bytes.`,
    );
  }

  const decompressedBytes = gunzipSync(compressedBytes);
  if (decompressedBytes.byteLength > MAX_BUNDLE_DECOMPRESSED_BYTES) {
    fs.unlinkSync(outputPath);
    throw new Error(
      `Policy bundle exceeds the ${MAX_BUNDLE_DECOMPRESSED_BYTES} byte decompressed upload limit (${decompressedBytes.byteLength} bytes).`,
    );
  }

  return outputPath;
}
