import { Buffer } from 'node:buffer';
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
  /** Signal that terminated the process, when present. */
  signal?: NodeJS.Signals;
  /** Whether stdout or stderr exceeded the configured capture limit. */
  outputTruncated?: boolean;
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
    /** Child environment; PATH is retained so the executable can be resolved. */
    env?: NodeJS.ProcessEnv;
    /** Optional process timeout. */
    timeoutMs?: number;
    /** Maximum bytes retained from each output stream. */
    maxOutputBytes?: number;
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
      env: {
        ...(options.env ?? context.process.env),
        PATH: context.process.env.PATH,
        NO_COLOR: '1',
      },
      stdio: 'pipe',
      ...(options.timeoutMs ? { timeout: options.timeoutMs, killSignal: 'SIGTERM' } : {}),
    });
    let stdout = '';
    let stderr = '';
    let outputTruncated = false;
    const appendOutput = (output: string, chunk: string): string => {
      if (!options.maxOutputBytes) {
        return output + chunk;
      }
      const remaining = options.maxOutputBytes - Buffer.byteLength(output);
      const bytes = Buffer.from(chunk);
      if (remaining <= 0) {
        outputTruncated = true;
        return output;
      }
      if (bytes.length > remaining) {
        outputTruncated = true;
        return output + bytes.subarray(0, remaining).toString('utf8');
      }
      return output + chunk;
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr.on('data', (chunk: string) => {
      stderr = appendOutput(stderr, chunk);
    });
    child.once('error', (error: NodeJS.ErrnoException) => {
      resolveResult({
        code: 1,
        stdout,
        stderr,
        error,
        ...(outputTruncated ? { outputTruncated } : {}),
      });
    });
    child.once('close', (code, signal) => {
      resolveResult({
        code: code ?? 1,
        stdout,
        stderr,
        ...(signal ? { signal } : {}),
        ...(outputTruncated ? { outputTruncated } : {}),
      });
    });
    if (options.input === undefined) {
      child.stdin.end();
    } else {
      child.stdin.end(options.input);
    }
  });
