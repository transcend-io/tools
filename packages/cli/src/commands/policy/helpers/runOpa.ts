import { spawn } from 'node:child_process';

import { OPA_INSTALL_HINT } from '../constants.js';

/**
 * Runs an OPA CLI command and streams stdout/stderr to the current process.
 *
 * @param args - Arguments passed to the `opa` binary
 * @param options - Optional working directory
 * @returns The child process exit code
 */
export function runOpa(args: string[], options: { cwd?: string } = {}): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const child = spawn('opa', args, {
      cwd: options.cwd,
      stdio: 'inherit',
    });

    child.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error(OPA_INSTALL_HINT));
        return;
      }
      reject(err);
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}
