import { spawnSync } from 'node:child_process';

import { OPA_INSTALL_HINT } from '../constants.js';

/** Options used to suppress output from the availability check. */
interface OpaSpawnOptions {
  /** Discard child process output. */
  stdio: 'ignore';
}

/** Synchronously invokes a command for availability checks. */
type SpawnSync = (
  command: string,
  args: string[],
  options: OpaSpawnOptions,
) => Pick<ReturnType<typeof spawnSync>, 'error' | 'status'>;

/**
 * Ensures the `opa` binary is available on PATH.
 *
 * @param runSpawnSync - Child process runner dependency
 * @throws Error when `opa` is not installed
 */
export function assertOpaInstalled(runSpawnSync: SpawnSync = spawnSync): void {
  const result = runSpawnSync('opa', ['version'], { stdio: 'ignore' });
  if (result.error || result.status !== 0) {
    throw new Error(OPA_INSTALL_HINT);
  }
}
