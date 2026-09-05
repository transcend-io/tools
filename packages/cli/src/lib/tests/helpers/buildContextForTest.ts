import { Console } from 'node:console';
import fs from 'node:fs';
import { Readable, Writable } from 'node:stream';

import { vi, type MockedFunction } from 'vitest';

import { buildContext, type CliLogger, type LocalContext } from '../../../context.js';

/**
 * Behavior of the fake process exit function.
 */
export type TestExitBehavior = 'record' | 'throw';

/**
 * Options for constructing a test CLI context.
 */
export interface BuildContextForTestOptions {
  /** Environment variables merged over a copy of the current environment */
  readonly env?: NodeJS.ProcessEnv;
  /** Process arguments exposed by the fake process */
  readonly argv?: string[];
  /** Working directory returned by the fake process */
  readonly cwd?: string;
  /** Whether the fake stdin is attached to a TTY */
  readonly stdinIsTTY?: boolean;
  /** How calls to process.exit should behave */
  readonly exitBehavior?: TestExitBehavior;
  /** Filesystem implementation */
  readonly fs?: typeof fs;
  /** Logger implementation; defaults to a Console backed by captured streams */
  readonly logger?: CliLogger;
}

/**
 * A test context with captured terminal output and controls.
 */
export interface TestLocalContext extends LocalContext {
  /** Captured standard output */
  readonly stdout: string;
  /** Captured standard error */
  readonly stderr: string;
  /** Mocked process exit function */
  readonly exit: MockedFunction<NodeJS.Process['exit']>;
  /** Clear captured output and exit call history */
  readonly reset: () => void;
}

/**
 * Error thrown when a test context is configured to throw on process exit.
 */
export class TestProcessExitError extends Error {
  /** Requested process exit code */
  public readonly code: string | number | null | undefined;

  /**
   * Create a process exit error.
   *
   * @param code - Requested process exit code.
   */
  public constructor(code?: string | number | null) {
    super(`Process exited with code ${code ?? ''}`);
    this.name = 'TestProcessExitError';
    this.code = code;
  }
}

/**
 * Build an in-memory writable stream.
 *
 * @param chunks - Destination for written chunks.
 * @returns A writable stream compatible with Node process streams.
 */
function buildCapturedStream(chunks: string[]): NodeJS.WriteStream {
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });
  Object.defineProperty(stream, 'isTTY', { value: false });
  return stream as NodeJS.WriteStream;
}

/**
 * Build an isolated CLI context for tests.
 *
 * This follows Stricli's recommended testing pattern: commands write through
 * the context process streams, and tests read the accumulated strings from
 * the returned context without replacing global process or console methods.
 *
 * @param options - Process and dependency overrides.
 * @returns A complete CLI context with captured output.
 */
export function buildContextForTest(options: BuildContextForTestOptions = {}): TestLocalContext {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const stdout = buildCapturedStream(stdoutChunks);
  const stderr = buildCapturedStream(stderrChunks);
  const stdin = new Readable({ read() {} }) as NodeJS.ReadStream;
  Object.defineProperty(stdin, 'isTTY', {
    value: options.stdinIsTTY ?? true,
    configurable: true,
  });

  const exit = vi.fn<NodeJS.Process['exit']>((code) => {
    if ((options.exitBehavior ?? 'throw') === 'throw') {
      throw new TestProcessExitError(code);
    }
    return undefined as never;
  });

  const testProcess = Object.create(globalThis.process) as NodeJS.Process;
  Object.defineProperties(testProcess, {
    argv: {
      value: options.argv ? [...options.argv] : [...globalThis.process.argv],
      configurable: true,
    },
    cwd: {
      value: () => options.cwd ?? globalThis.process.cwd(),
      configurable: true,
    },
    env: {
      value: { ...globalThis.process.env, ...options.env },
      configurable: true,
    },
    exit: { value: exit, configurable: true },
    stdin: { value: stdin, configurable: true },
    stdout: { value: stdout, configurable: true },
    stderr: { value: stderr, configurable: true },
  });

  const context = buildContext(testProcess, {
    fs: options.fs,
    logger:
      options.logger ??
      new Console({
        stdout,
        stderr,
        colorMode: false,
      }),
  });

  Object.defineProperties(context, {
    stdout: {
      get: () => stdoutChunks.join(''),
    },
    stderr: {
      get: () => stderrChunks.join(''),
    },
    exit: {
      value: exit,
    },
    reset: {
      value: () => {
        stdoutChunks.length = 0;
        stderrChunks.length = 0;
        exit.mockClear();
      },
    },
  });

  return context as TestLocalContext;
}
