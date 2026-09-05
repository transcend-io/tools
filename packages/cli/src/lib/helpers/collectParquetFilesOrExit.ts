import colors from 'colors';

import type { LocalContext } from '../../context.js';

/**
 * Validate flags and collect Parquet file paths from a directory.
 * On validation error, the provided `exit` function is called.
 *
 * @param directory - the directory containing Parquet files
 * @param localContext - the context of the command, used for logging and exit
 * @returns an array of valid Parquet file paths
 */
export function collectParquetFilesOrExit(
  directory: string | undefined,
  localContext: LocalContext,
): string[] {
  if (!directory) {
    localContext.logger.error(colors.red('A --directory must be provided.'));
    localContext.process.exit(1);
  }

  let files: string[] = [];
  try {
    const entries = localContext.fs.readdirSync(directory);
    files = entries
      .filter((f) => f.endsWith('.parquet'))
      .map((f) => localContext.path.join(directory, f))
      .filter((p) => {
        try {
          return localContext.fs.statSync(p).isFile();
        } catch {
          return false;
        }
      });
  } catch (err) {
    localContext.logger.error(colors.red(`Failed to read directory: ${directory}`));
    localContext.logger.error(colors.red((err as Error).message));
    localContext.process.exit(1);
  }

  if (files.length === 0) {
    localContext.logger.error(colors.red(`No Parquet files found in directory: ${directory}`));
    localContext.process.exit(1);
  }
  localContext.logger.info(colors.green(`Found: ${files.join(', ')} parquet files`));
  return files;
}
