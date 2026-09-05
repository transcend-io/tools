import colors from 'colors';

import type { LocalContext } from '../../context.js';

/**
 * Validate flags and collect CSV file paths from a directory.
 * On validation error, the provided `exit` function is called.
 *
 * @param directory - the directory containing CSV files
 * @param localContext - the context of the command, used for logging and exit
 * @returns an array of valid CSV file paths
 */
export function collectCsvFilesOrExit(
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
      .filter((f) => f.endsWith('.csv'))
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
    localContext.logger.error(colors.red(`No CSV files found in directory: ${directory}`));
    localContext.process.exit(1);
  }
  localContext.logger.info(colors.green(`Found ${files.length} CSV files in ${directory}`));
  return files;
}
