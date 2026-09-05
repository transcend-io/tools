import * as nodeFs from 'node:fs';
import { join } from 'node:path';

import { getFilePrefix } from '../computeFiles.js';

/** Dependencies used to resolve a receipt path. */
export interface ResolveReceiptPathDependencies {
  /** Filesystem operations used to locate candidate receipts. */
  filesystem?: Pick<typeof nodeFs, 'existsSync' | 'readdirSync' | 'statSync'>;
}

/**
 * Find the receipt JSON for a given input file (supports suffixes like __1).
 *
 * @param receiptsFolder - Where to look for receipts
 * @param filePath - The input file path to match against
 * @param dependencies - Optional runtime dependencies
 * @returns The path to the receipt file, or null if not found
 */
export function resolveReceiptPath(
  receiptsFolder: string,
  filePath: string,
  dependencies: ResolveReceiptPathDependencies = {},
): string | null {
  const filesystem = dependencies.filesystem ?? nodeFs;
  const base = `${getFilePrefix(filePath)}-receipts.json`;
  const exact = join(receiptsFolder, base);
  if (filesystem.existsSync(exact)) return exact;

  const prefix = `${getFilePrefix(filePath)}-receipts`;
  try {
    const entries = filesystem
      .readdirSync(receiptsFolder)
      .filter((n) => n.startsWith(prefix) && n.endsWith('.json'))
      .map((name) => {
        const full = join(receiptsFolder, name);
        let mtime = 0;
        try {
          mtime = filesystem.statSync(full).mtimeMs;
        } catch {
          // ignore if stat fails
        }
        return { full, mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);
    return entries[0]?.full ?? null;
  } catch {
    return null;
  }
}
