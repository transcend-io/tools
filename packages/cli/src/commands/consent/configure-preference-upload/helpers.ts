import colors from 'colors';
import { parse as csvParse } from 'csv-parse';

import type { LocalContext } from '../../../context.js';

/** Max number of CSV files scanned in parallel */
const SCAN_CONCURRENCY = 25;

/** Column headers and unique values discovered while scanning CSV files */
export interface ScannedCsvColumns {
  /** Union of all column headers */
  headers: string[];
  /** Map of column name to its unique values (trimmed) */
  uniqueValuesByColumn: Record<string, Set<string>>;
}

/**
 * Scan a single CSV file and collect its column headers plus all unique
 * values per column. Uses streaming so large files don't need to be held
 * in memory.
 *
 * @param file - CSV file path to scan
 * @param fs - Filesystem implementation
 * @returns headers and uniqueValuesByColumn
 */
async function scanOneFile(
  file: string,
  fs: LocalContext['fs'],
): Promise<{
  /** Column headers seen in this file */
  headers: Set<string>;
  /** Unique values per column in this file */
  uniqueValuesByColumn: Record<string, Set<string>>;
}> {
  const headers = new Set<string>();
  const uniqueValuesByColumn: Record<string, Set<string>> = {};

  await new Promise<void>((resolve, reject) => {
    const parser = fs
      .createReadStream(file)
      .pipe(csvParse({ columns: true, skip_empty_lines: true }));
    parser.on('data', (row: Record<string, string>) => {
      for (const [col, val] of Object.entries(row)) {
        headers.add(col);
        if (!uniqueValuesByColumn[col]) {
          uniqueValuesByColumn[col] = new Set();
        }
        uniqueValuesByColumn[col].add((val || '').trim());
      }
    });
    parser.on('end', resolve);
    parser.on('error', reject);
  });

  return { headers, uniqueValuesByColumn };
}

/**
 * Scan many CSV files in parallel and merge their headers and unique values.
 *
 * @param files - CSV file paths to scan
 * @param deps - Filesystem and logger
 * @returns Merged headers and unique values per column
 */
export async function scanCsvFiles(
  files: string[],
  { fs, logger }: Pick<LocalContext, 'fs' | 'logger'>,
): Promise<ScannedCsvColumns> {
  const allHeaders = new Set<string>();
  const merged: Record<string, Set<string>> = {};
  let completed = 0;

  const queue = [...files];
  const run = async (): Promise<void> => {
    for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
      const result = await scanOneFile(file, fs);
      for (const h of result.headers) allHeaders.add(h);
      for (const [col, vals] of Object.entries(result.uniqueValuesByColumn)) {
        if (!merged[col]) merged[col] = new Set();
        for (const v of vals) merged[col].add(v);
      }
      completed += 1;
      if (completed % 25 === 0 || completed === files.length) {
        logger.info(colors.green(`  Scanned ${completed}/${files.length} files...`));
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(SCAN_CONCURRENCY, files.length) }, () => run()));

  return { headers: [...allHeaders], uniqueValuesByColumn: merged };
}

/**
 * Build synthetic preference rows from the scanned unique values so
 * the existing parse functions see every value at least once.
 *
 * Row count is driven only by `enumColumns` (purpose/preference columns)
 * whose unique values actually matter for mapping. High-cardinality
 * columns like timestamps or emails are filled with a single sample value.
 *
 * @param headers - all column headers
 * @param uniqueValuesByColumn - unique values per column
 * @param enumColumns - columns whose full unique values must be represented
 * @returns synthetic rows covering all unique enum values
 */
export function buildSyntheticRows(
  headers: string[],
  uniqueValuesByColumn: Record<string, Set<string>>,
  enumColumns: string[] = [],
): Record<string, string>[] {
  const enumSet = new Set(enumColumns);
  const maxRows = Math.max(1, ...enumColumns.map((h) => uniqueValuesByColumn[h]?.size ?? 0));
  const rows: Record<string, string>[] = [];
  for (let i = 0; i < maxRows; i += 1) {
    const row: Record<string, string> = {};
    for (const h of headers) {
      const vals = uniqueValuesByColumn[h] ? [...uniqueValuesByColumn[h]] : [''];
      row[h] = enumSet.has(h) ? (vals[i % vals.length] ?? '') : (vals[0] ?? '');
    }
    rows.push(row);
  }
  return rows;
}
