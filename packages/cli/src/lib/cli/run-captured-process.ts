import { spawn } from 'node:child_process';

import type { LocalContext } from '../../context.js';

/** Captured subprocess result. */
export interface CapturedProcessResult {
  /** Process exit code. */
  code: number;
  /** Captured standard output. */
  stdout: string;
  /** Captured standard error. */
  stderr: string;
  /** Spawn error, when the executable did not start. */
  error?: NodeJS.ErrnoException;
}

/** Captured subprocess runner. */
export type CapturedProcessRunner = (
  command: string,
  args: readonly string[],
  options: {
    /** Working directory. */
    cwd: string;
    /** Optional standard input. */
    input?: string;
  },
  context: LocalContext,
) => Promise<CapturedProcessResult>;

/**
 * Capture a subprocess without forwarding its output.
 *
 * @param command - Executable
 * @param args - Arguments
 * @param options - CWD and optional standard input
 * @param context - CLI context
 * @returns Captured result
 */
export const runCapturedProcess: CapturedProcessRunner = (command, args, options, context) =>
  new Promise((resolveResult) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: { ...context.process.env, NO_COLOR: '1' },
      stdio: 'pipe',
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', (error: NodeJS.ErrnoException) => {
      resolveResult({ code: 1, stdout, stderr, error });
    });
    child.once('close', (code) => {
      resolveResult({ code: code ?? 1, stdout, stderr });
    });
    if (options.input === undefined) {
      child.stdin.end();
    } else {
      child.stdin.end(options.input);
    }
  });
