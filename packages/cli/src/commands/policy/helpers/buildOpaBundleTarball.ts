import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { MAX_BUNDLE_COMPRESSED_BYTES, MAX_BUNDLE_DECOMPRESSED_BYTES } from '../constants.js';
import { assertOpaInstalled } from './assertOpaInstalled.js';
import { runOpa } from './runOpa.js';

/**
 * Builds an OPA bundle tarball from a local policy directory.
 *
 * @param dir - Directory containing `.rego` files and optional `data.json`
 * @returns Absolute path to the generated `.tar.gz` bundle
 */
export async function buildOpaBundleTarball(dir: string): Promise<string> {
  assertOpaInstalled();

  const resolvedDir = path.resolve(dir);
  if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
    throw new Error(`Policy directory does not exist or is not a directory: ${resolvedDir}`);
  }

  const outputPath = path.join(
    os.tmpdir(),
    `transcend-policy-bundle-${Date.now()}-${Math.random().toString(36).slice(2)}.tar.gz`,
  );

  const exitCode = await runOpa(['build', '-b', resolvedDir, '-o', outputPath]);
  if (exitCode !== 0) {
    throw new Error(`opa build failed with exit code ${exitCode}`);
  }

  const size = fs.statSync(outputPath).size;
  if (size > MAX_BUNDLE_COMPRESSED_BYTES) {
    fs.unlinkSync(outputPath);
    throw new Error(
      `Policy bundle exceeds the ${MAX_BUNDLE_COMPRESSED_BYTES} byte compressed upload limit (${size} bytes). ` +
        `The server also rejects decompressed bundles larger than ${MAX_BUNDLE_DECOMPRESSED_BYTES} bytes.`,
    );
  }

  return outputPath;
}
