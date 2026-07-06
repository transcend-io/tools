import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { MAX_BUNDLE_COMPRESSED_BYTES } from '../constants.js';
import { assertOpaInstalled } from './assertOpaInstalled.js';
import { runOPACapture } from './runOpa.js';

/**
 * Builds a compiled OPA policy bundle (`.tar.gz`) for upload to Transcend.
 *
 * Shells out to `opa build` to produce a standard OPA bundle — a gzipped
 * tarball containing `/.manifest`, `/data.json`, and one or more compiled
 * `.rego` (or `wasm`) files. The server validates this bundle structure and
 * content-addresses the blob by SHA-256; it does not recompile.
 *
 * Rego test files (`*_test.rego`) are excluded from the compiled bundle since
 * they are for local validation only and are not part of the upload contract.
 *
 * @param dir - Directory containing `.rego` policy files (and optional `data.json`)
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

  // `opa build` compiles the Rego and emits a standard OPA bundle. Run with
  // `cwd` set to the bundle directory and pass `.` so archive entries are
  // rooted at the bundle root (passing an absolute path would embed the full
  // filesystem prefix in every entry). Failures (syntax errors, missing
  // imports, etc.) surface a non-zero exit code and a descriptive stderr —
  // propagate both so the CLI exits non-zero with a clear error.
  const { code, stderr } = await runOPACapture(
    ['build', '--v0-compatible', '--ignore', '*_test.rego', '-o', outputPath, '.'],
    { cwd: resolvedDir },
  );
  if (code !== 0) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    throw new Error(stderr.trim() || `opa build failed with exit code ${code}`);
  }

  const compressedBytes = fs.existsSync(outputPath) ? fs.readFileSync(outputPath).byteLength : 0;
  if (compressedBytes === 0) {
    throw new Error('opa build did not produce a bundle tarball.');
  }
  if (compressedBytes > MAX_BUNDLE_COMPRESSED_BYTES) {
    fs.unlinkSync(outputPath);
    throw new Error(
      `Policy bundle exceeds the ${MAX_BUNDLE_COMPRESSED_BYTES} byte compressed upload limit (${compressedBytes} bytes).`,
    );
  }

  return outputPath;
}
