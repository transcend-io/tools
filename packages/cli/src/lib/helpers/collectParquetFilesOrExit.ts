import fs from 'node:fs';
import path from 'node:path';

import colors from 'colors';

import { logger } from '../../logger.js';

/** Runtime dependencies used to collect Parquet files. */
export interface CollectParquetFilesOrExitDependencies {
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
export interface CollectParquetFilesOrExitProcessContext {
  /** Process implementation used to terminate on validation errors. */
  readonly process: Pick<NodeJS.Process, 'exit'>;
}

const defaultDependencies: CollectParquetFilesOrExitDependencies = {
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
    | CollectParquetFilesOrExitDependencies
    | CollectParquetFilesOrExitProcessContext = defaultDependencies,
): CollectParquetFilesOrExitDependencies {
  return 'fs' in dependencies
    ? dependencies
    : {
        ...defaultDependencies,
        process: dependencies.process,
      };
}

/**
 * Validate flags and collect Parquet file paths from a directory.
 * On validation error, the provided `exit` function is called.
 *
 * @param directory - the directory containing Parquet files
 * @param dependencies - Runtime dependencies or a legacy process-only context
 * @returns an array of valid Parquet file paths
 */
export function collectParquetFilesOrExit(
  directory: string | undefined,
  dependencies?: CollectParquetFilesOrExitDependencies | CollectParquetFilesOrExitProcessContext,
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
      .filter((f) => f.endsWith('.parquet'))
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
    runtime.logger.error(colors.red(`No Parquet files found in directory: ${directory}`));
    runtime.process.exit(1);
  }
  runtime.logger.info(colors.green(`Found: ${files.join(', ')} parquet files`));
  return files;
}
