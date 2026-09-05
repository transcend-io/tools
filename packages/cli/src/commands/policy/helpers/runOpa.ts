import { spawn } from 'node:child_process';

import { OPA_INSTALL_HINT } from '../constants.js';

/** Options for an OPA CLI invocation. */
export interface RunOpaOptions {
  /** Working directory for the child process. */
  cwd?: string;
}

/** Runtime dependencies used to invoke the OPA CLI. */
export interface RunOpaDependencies {
  /** Child process launcher. */
  readonly spawn: typeof spawn;
  /** Environment variables passed to the child process. */
  readonly env: NodeJS.ProcessEnv;
  /** Process streams used for interactive OPA commands. */
  readonly stdio: Pick<NodeJS.Process, 'stdin' | 'stdout' | 'stderr'>;
}

/** Result of an OPA CLI invocation with captured output. */
export interface RunOpaCaptureResult {
  /** Child process exit code */
  code: number;
  /** Captured stdout */
  stdout: string;
  /** Captured stderr */
  stderr: string;
}

const defaultDependencies: RunOpaDependencies = {
  spawn,
  env: process.env,
  stdio: process,
};

/**
 * Runs an OPA CLI command and streams stdout/stderr to the current process.
 *
 * @param args - Arguments passed to the `opa` binary
 * @param options - Optional working directory
 * @param dependencies - Runtime dependencies used to invoke OPA
 * @returns The child process exit code
 */
export function runOpa(
  args: string[],
  options: RunOpaOptions = {},
  dependencies: RunOpaDependencies = defaultDependencies,
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const child = dependencies.spawn('opa', args, {
      cwd: options.cwd,
      env: dependencies.env,
      stdio: [dependencies.stdio.stdin, dependencies.stdio.stdout, dependencies.stdio.stderr],
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
 * @param dependencies - Runtime dependencies used to invoke OPA
 * @returns Exit code and captured output
 */
export function runOPACapture(
  args: string[],
  options: RunOpaOptions = {},
  dependencies: RunOpaDependencies = defaultDependencies,
): Promise<RunOpaCaptureResult> {
  return new Promise<RunOpaCaptureResult>((resolve, reject) => {
    const child = dependencies.spawn('opa', args, {
      cwd: options.cwd,
      env: dependencies.env,
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
