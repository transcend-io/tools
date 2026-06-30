import { spawnSync } from 'node:child_process';

import { OPA_INSTALL_HINT } from '../constants.js';

/**
 * Ensures the `opa` binary is available on PATH.
 *
 * @throws Error when `opa` is not installed
 */
export function assertOpaInstalled(): void {
  const result = spawnSync('opa', ['version'], { stdio: 'ignore' });
  if (result.error || result.status !== 0) {
    throw new Error(OPA_INSTALL_HINT);
  }
}
