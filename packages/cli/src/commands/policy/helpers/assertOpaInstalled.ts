import { spawnSync } from 'node:child_process';

import { OPA_INSTALL_HINT } from '../constants.js';

/** Runtime dependencies used to check for the OPA CLI. */
export interface AssertOpaInstalledDependencies {
  /** Synchronous child process launcher. */
  readonly spawnSync: typeof spawnSync;
  /** Environment variables passed to the child process. */
  readonly env: NodeJS.ProcessEnv;
}

/** Legacy child process runner accepted by the availability check. */
export type AssertOpaInstalledSpawnSync = (
  command: string,
  args: string[],
  options: {
    /** Discard child process output. */
    stdio: 'ignore';
  },
) => Pick<ReturnType<typeof spawnSync>, 'error' | 'status'>;

const defaultDependencies: AssertOpaInstalledDependencies = {
  spawnSync,
  env: process.env,
};

/**
 * Ensures the `opa` binary is available on PATH.
 *
 * @param dependencies - Runtime dependencies or the legacy spawn function
 * @throws Error when `opa` is not installed
 */
export function assertOpaInstalled(
  dependencies: AssertOpaInstalledDependencies | AssertOpaInstalledSpawnSync = defaultDependencies,
): void {
  const result =
    typeof dependencies === 'function'
      ? dependencies('opa', ['version'], { stdio: 'ignore' })
      : dependencies.spawnSync('opa', ['version'], {
          env: dependencies.env,
          stdio: 'ignore',
        });
  if (result.error || result.status !== 0) {
    throw new Error(OPA_INSTALL_HINT);
  }
}
