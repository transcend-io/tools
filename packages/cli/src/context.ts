import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { StricliAutoCompleteContext } from '@stricli/auto-complete';
import type { CommandContext } from '@stricli/core';

/**
 * Logger methods available to CLI commands.
 */
export type CliLogger = Pick<Console, 'debug' | 'error' | 'info' | 'log' | 'warn'>;

/**
 * Runtime dependencies used to build a CLI context.
 */
export interface BuildContextOptions {
  /** Filesystem implementation */
  readonly fs?: typeof fs;
  /** Operating system implementation */
  readonly os?: typeof os;
  /** Path implementation */
  readonly path?: typeof path;
  /** Logger implementation */
  readonly logger?: CliLogger;
}

export interface LocalContext extends CommandContext, StricliAutoCompleteContext {
  /** The Node.js process object */
  readonly process: NodeJS.Process;
  /** Filesystem implementation */
  readonly fs: typeof fs;
  /** Operating system implementation */
  readonly os: typeof os;
  /** Path implementation */
  readonly path: typeof path;
  /** Logger implementation */
  readonly logger: CliLogger;
}

/**
 * Builds the context for the CLI.
 *
 * @param process - The Node.js process object.
 * @param options - Optional runtime dependency overrides.
 * @returns The context for the CLI.
 */
export function buildContext(
  process: NodeJS.Process,
  options: BuildContextOptions = {},
): LocalContext {
  return {
    process,
    os: options.os ?? os,
    fs: options.fs ?? fs,
    path: options.path ?? path,
    logger: options.logger ?? console,
  };
}
