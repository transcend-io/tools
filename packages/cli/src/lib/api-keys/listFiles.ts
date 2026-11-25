import { existsSync, readdirSync } from 'node:fs';

/**
 * Filter directory entry names to files recognized by the CLI.
 *
 * @param entries - Directory entry names.
 * @param validExtensions - The list of valid extensions.
 * @param removeExtensions - When true, remove extensions from returned names.
 * @returns Filtered file names.
 */
export function filterFileNames(
  entries: string[],
  validExtensions?: string[],
  removeExtensions = false,
): string[] {
  const files = entries
    .filter((file) =>
      validExtensions ? validExtensions.some((extension) => file.endsWith(extension)) : true,
    )
    .filter((file) => file.indexOf('.') > 0);

  return removeExtensions ? files.map((file) => file.replace(/\.[^/.]+$/, '')) : files;
}

/**
 * List the files in a directory
 *
 * ```typescript
 * // The directory to search
 * const directory = '/User/test/transcend/my-app/app/containers';
 * // Returns ['test.js']
 * listFiles(directory);
 * ```
 *
 * @param directory - The directory to search
 * @param validExtensions - The list of valid extensions
 * @param removeExtensions - When true, remove the extensions from the listed files
 * @returns The list of files in the directory
 */
export function listFiles(
  directory: string,
  validExtensions?: string[],
  removeExtensions = false,
): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return filterFileNames(readdirSync(directory), validExtensions, removeExtensions);
}
