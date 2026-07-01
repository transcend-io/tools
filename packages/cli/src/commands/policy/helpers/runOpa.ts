import { spawn } from 'node:child_process';

import { OPA_INSTALL_HINT } from '../constants.js';

/** Result of an OPA CLI invocation with captured output. */
export interface RunOpaCaptureResult {
  /** Child process exit code */
  code: number;
  /** Captured stdout */
  stdout: string;
  /** Captured stderr */
  stderr: string;
}

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

/**
 * Runs an OPA CLI command and captures stdout/stderr.
 *
 * @param args - Arguments passed to the `opa` binary
 * @param options - Optional working directory
 * @returns Exit code and captured output
 */
export function runOpaCapture(
  args: string[],
  options: { cwd?: string } = {},
): Promise<RunOpaCaptureResult> {
  return new Promise<RunOpaCaptureResult>((resolve, reject) => {
    const child = spawn('opa', args, {
      cwd: options.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error(OPA_INSTALL_HINT));
        return;
      }
      reject(err);
    });
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}
