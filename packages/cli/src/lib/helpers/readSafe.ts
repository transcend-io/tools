import { readFileSync } from 'node:fs';

/** Reads a UTF-8 file from disk. */
type ReadUtf8File = (path: string, encoding: 'utf8') => string;

/**
 * Safely reads the contents of a file as a UTF-8 string.
 * Returns an empty string if the path is not provided or if reading fails.
 *
 * @param p - The path to the file to read.
 * @param readFile - File reader dependency.
 * @returns The file contents as a string, or an empty string on error.
 */
export function readSafe(p?: string, readFile: ReadUtf8File = readFileSync): string {
  try {
    return p ? readFile(p, 'utf8') : '';
  } catch {
    return '';
  }
}
