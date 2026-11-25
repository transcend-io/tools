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
  /** Whether the configured timeout elapsed. */
  timedOut?: boolean;
  /** Error encountered while writing standard input. */
  inputError?: NodeJS.ErrnoException;
  /** Whether stdout or stderr exceeded the configured capture limit. */
  outputTruncated?: boolean;
  /** Whether stdout exceeded the configured capture limit. */
  stdoutTruncated?: boolean;
  /** Whether stderr exceeded the configured capture limit. */
  stderrTruncated?: boolean;
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
    });
    let stdout = '';
    let stderr = '';
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    let inputError: NodeJS.ErrnoException | undefined;
    let settled = false;
    let forceKillTimer: NodeJS.Timeout | undefined;
    const timeoutTimer = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
          forceKillTimer = setTimeout(() => child.kill('SIGKILL'), 1000);
        }, options.timeoutMs)
      : undefined;
    const finish = (result: CapturedProcessResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
      if (forceKillTimer) {
        clearTimeout(forceKillTimer);
      }
      resolveResult({
        ...result,
        ...(timedOut ? { timedOut: true } : {}),
        ...(inputError ? { inputError } : {}),
        ...(stdoutTruncated || stderrTruncated ? { outputTruncated: true } : {}),
        ...(stdoutTruncated ? { stdoutTruncated: true } : {}),
        ...(stderrTruncated ? { stderrTruncated: true } : {}),
      });
    };
    const appendOutput = (output: string, chunk: string, markTruncated: () => void): string => {
      if (!options.maxOutputBytes) {
        return output + chunk;
      }
      const remaining = options.maxOutputBytes - Buffer.byteLength(output);
      const bytes = Buffer.from(chunk);
      if (remaining <= 0) {
        markTruncated();
        return output;
      }
      if (bytes.length > remaining) {
        markTruncated();
        let end = remaining;
        while (end > 0 && (bytes[end]! & 0b1100_0000) === 0b1000_0000) {
          end -= 1;
        }
        return output + bytes.subarray(0, end).toString('utf8');
      }
      return output + chunk;
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout = appendOutput(stdout, chunk, () => {
        stdoutTruncated = true;
      });
    });
    child.stderr.on('data', (chunk: string) => {
      stderr = appendOutput(stderr, chunk, () => {
        stderrTruncated = true;
      });
    });
    child.stdin.on('error', (error: NodeJS.ErrnoException) => {
      inputError = error;
    });
    child.once('error', (error: NodeJS.ErrnoException) => {
      finish({
        code: 1,
        stdout,
        stderr,
        error,
      });
    });
    child.once('close', (code, signal) => {
      finish({
        code: timedOut || inputError ? 1 : (code ?? 1),
        stdout,
        stderr,
        ...(signal ? { signal } : {}),
      });
    });
    try {
      if (options.input === undefined) {
        child.stdin.end();
      } else {
        child.stdin.end(options.input);
      }
    } catch (error) {
      inputError = error as NodeJS.ErrnoException;
      child.kill('SIGTERM');
    }
  });
