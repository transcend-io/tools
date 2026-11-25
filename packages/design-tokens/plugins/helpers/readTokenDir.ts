import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { TOKEN_FILE_SUFFIX } from './constants';

/** A parsed token file with its filename and non-`$` top-level keys. */
export interface TokenFileEntry {
  filename: string;
  topLevelKeys: string[];
}

/**
 * Read all token JSON files from a directory, parse each one, and
 * return the non-`$` top-level keys. Files with no qualifying keys
 * are omitted. Returns an empty array if the directory doesn't exist.
 */
export function readTokenDir(
  /** Absolute or relative path to the directory containing token JSON files. */
  dir: string,
  /** Predicate called with each filename; only files that pass are included. */
  filter?: (filename: string) => boolean,
): TokenFileEntry[] {
  let files: string[];
  try {
    files = readdirSync(dir);
  } catch {
    return [];
  }
  return files
    .filter((f) => f.endsWith(TOKEN_FILE_SUFFIX) && (!filter || filter(f)))
    .sort()
    .flatMap((filename) => {
      const filePath = join(dir, filename);
      let json: unknown;
      try {
        json = JSON.parse(readFileSync(filePath, 'utf-8'));
      } catch (err) {
        throw new Error(`Failed to parse ${filePath}: ${err instanceof Error ? err.message : err}`);
      }
      const topLevelKeys = Object.keys(json as Record<string, unknown>).filter(
        (k) => !k.startsWith('$'),
      );
      return topLevelKeys.length > 0 ? [{ filename, topLevelKeys }] : [];
    });
}
