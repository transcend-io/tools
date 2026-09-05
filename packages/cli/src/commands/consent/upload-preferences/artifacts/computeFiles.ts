import * as nodeFs from 'node:fs';
import { join, basename } from 'node:path';

/** Dependencies used while computing artifact files. */
export interface ComputeFilesDependencies {
  /** Filesystem operation used to create the receipts folder. */
  filesystem?: Pick<typeof nodeFs, 'mkdirSync'>;
}

/**
 * Derive a "prefix" for a CSV file (basename without ".csv"),
 * used to compute the receipt filename.
 *
 * @param file - The file name
 * @returns The file prefix
 */
export function getFilePrefix(file: string): string {
  return basename(file).replace('.csv', '');
}

/**
 * Ensure and return the receipts folder path.
 * If a directory flag is provided, default to sibling "../receipts".
 *
 * @param receiptFileDir - Optional directory for receipt files
 * @param directory - Optional directory containing CSV files
 * @param dependencies - Optional runtime dependencies
 * @returns The receipts folder path
 */
export function computeReceiptsFolder(
  receiptFileDir: string | undefined,
  directory: string | undefined,
  dependencies: ComputeFilesDependencies = {},
): string {
  const receiptsFolder =
    receiptFileDir || (directory ? join(directory, '../receipts') : './receipts');
  (dependencies.filesystem ?? nodeFs).mkdirSync(receiptsFolder, { recursive: true });
  return receiptsFolder;
}

/**
 * Resolve the schema file path.
 * - If user provided `schemaFilePath`, use it.
 * - Otherwise, default near the directory or next to the single file.
 *
 * @param schemaFilePath - Optional path to the schema file
 * @param directory - Optional directory containing CSV files
 * @param firstFile - The first CSV file to derive the prefix from
 * @returns The resolved schema file path
 */
export function computeSchemaFile(
  schemaFilePath: string | undefined,
  directory: string | undefined,
  firstFile: string,
): string {
  return (
    schemaFilePath ||
    (directory
      ? join(directory, '../preference-upload-schema.json')
      : `${getFilePrefix(firstFile)}-preference-upload-schema.json`)
  );
}
