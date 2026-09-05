import fs from 'node:fs';
import path from 'node:path';

/** Runtime dependencies used to list directories. */
export interface ListDirectoriesDependencies {
  /** Filesystem operations used to inspect directory entries. */
  readonly fs: Pick<typeof fs, 'readdirSync' | 'statSync'>;
  /** Path operations used to resolve directory entries. */
  readonly path: Pick<typeof path, 'join'>;
}

const defaultDependencies: ListDirectoriesDependencies = { fs, path };

/**
 * List the folders in a directory
 *
 * @param startDir - The base directory to list from
 * @param dependencies - Runtime dependencies used to inspect the directory
 * @returns The list of folders in that directory
 */
export function listDirectories(
  startDir: string,
  dependencies: ListDirectoriesDependencies = defaultDependencies,
): string[] {
  return dependencies.fs
    .readdirSync(startDir)
    .filter((entryName) =>
      dependencies.fs.statSync(dependencies.path.join(startDir, entryName)).isDirectory(),
    );
}
