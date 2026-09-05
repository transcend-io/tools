import fs from 'node:fs';
import path from 'node:path';

import colors from 'colors';

import { logger } from '../../logger.js';

/** Runtime dependencies used to collect CSV files. */
export interface CollectCsvFilesOrExitDependencies {
  /** Filesystem operations used to inspect directory entries. */
  readonly fs: Pick<typeof fs, 'readdirSync' | 'statSync'>;
  /** Path operations used to resolve directory entries. */
  readonly path: Pick<typeof path, 'join'>;
  /** Logger used to report validation and discovery results. */
  readonly logger: Pick<typeof logger, 'error' | 'info'>;
  /** Process implementation used to terminate on validation errors. */
  readonly process: Pick<NodeJS.Process, 'exit'>;
}

/** Legacy process-only context accepted by the collection helper. */
export interface CollectCsvFilesOrExitProcessContext {
  /** Process implementation used to terminate on validation errors. */
  readonly process: Pick<NodeJS.Process, 'exit'>;
}

const defaultDependencies: CollectCsvFilesOrExitDependencies = {
  fs,
  path,
  logger,
  process,
};

/**
 * Resolve full collection dependencies from current or legacy callers.
 *
 * @param dependencies - Full dependencies or a legacy process-only context
 * @returns Full runtime dependencies
 */
function resolveDependencies(
  dependencies:
    | CollectCsvFilesOrExitDependencies
    | CollectCsvFilesOrExitProcessContext = defaultDependencies,
): CollectCsvFilesOrExitDependencies {
  return 'fs' in dependencies
    ? dependencies
    : {
        ...defaultDependencies,
        process: dependencies.process,
      };
}

/**
 * Validate flags and collect CSV file paths from a directory.
 * On validation error, the provided `exit` function is called.
 *
 * @param directory - the directory containing CSV files
 * @param dependencies - Runtime dependencies or a legacy process-only context
 * @returns an array of valid CSV file paths
 */
export function collectCsvFilesOrExit(
  directory: string | undefined,
  dependencies?: CollectCsvFilesOrExitDependencies | CollectCsvFilesOrExitProcessContext,
): string[] {
  const runtime = resolveDependencies(dependencies);

  if (!directory) {
    runtime.logger.error(colors.red('A --directory must be provided.'));
    return runtime.process.exit(1);
  }

  let files: string[] = [];
  try {
    const entries = runtime.fs.readdirSync(directory);
    files = entries
      .filter((f) => f.endsWith('.csv'))
      .map((f) => runtime.path.join(directory, f))
      .filter((p) => {
        try {
          return runtime.fs.statSync(p).isFile();
        } catch {
          return false;
        }
      });
  } catch (err) {
    runtime.logger.error(colors.red(`Failed to read directory: ${directory}`));
    runtime.logger.error(colors.red((err as Error).message));
    runtime.process.exit(1);
  }

  if (files.length === 0) {
    runtime.logger.error(colors.red(`No CSV files found in directory: ${directory}`));
    runtime.process.exit(1);
  }
  runtime.logger.info(colors.green(`Found ${files.length} CSV files in ${directory}`));
  return files;
}
