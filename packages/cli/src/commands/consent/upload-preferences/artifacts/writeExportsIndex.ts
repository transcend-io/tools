import * as nodeFs from 'node:fs';
// artifacts/indexWriter.ts
import { join } from 'node:path';
import { pathToFileURL as nodePathToFileURL } from 'node:url';

import type { ExportStatusMap } from '@transcend-io/utils';

import { artifactAbsPath, type ExportKindWithCsv } from './artifactAbsPath.js';

let lastIndexFileContents = '';

/** Dependencies used to write the exports index. */
export interface WriteExportsIndexDependencies {
  /** Filesystem operations used to create and write the index. */
  filesystem?: Pick<typeof nodeFs, 'mkdirSync' | 'writeFileSync'>;
  /** Converts an artifact path to a file URL. */
  pathToFileURL?: typeof nodePathToFileURL;
}

/**
 * Get the absolute path for an export artifact based on its kind.
 *
 * @param exportsDir - Optional directory where exports are stored
 * @param exportStatus - Optional status of the export artifact
 * @param exportsFile - The name of the exports index file
 * @param dependencies - Optional runtime dependencies
 * @returns The absolute path to the export artifact
 */
export function writeExportsIndex(
  exportsDir?: string,
  exportStatus?: ExportStatusMap,
  exportsFile = 'exports.index.txt',
  dependencies: WriteExportsIndexDependencies = {},
): string | undefined {
  if (!exportsDir) return undefined;
  const filesystem = dependencies.filesystem ?? nodeFs;
  const pathToFileURL = dependencies.pathToFileURL ?? nodePathToFileURL;
  const lines: string[] = ['# Export artifacts — latest paths', ''];

  const kinds: Array<
    [ExportKindWithCsv, ExportStatusMap[keyof ExportStatusMap] | undefined, string]
  > = [
    ['error', exportStatus?.error, 'Errors log'],
    ['warn', exportStatus?.warn, 'Warnings log'],
    ['info', exportStatus?.info, 'Info log'],
    ['all', exportStatus?.all, 'All logs'],
    ['failures-csv', exportStatus?.failuresCsv, 'Failing updates (CSV)'],
  ];

  for (const [k, st, label] of kinds) {
    const abs = artifactAbsPath(k, exportsDir, st);
    const url = abs.startsWith('(') ? abs : pathToFileURL(abs).href;
    lines.push(`${label}:`);
    lines.push(`  path: ${abs}`);
    lines.push(`  url:  ${url}`);
    lines.push('');
  }

  const content = lines.join('\n');
  const out = join(exportsDir, exportsFile);
  if (content !== lastIndexFileContents) {
    filesystem.mkdirSync(exportsDir, { recursive: true });
    filesystem.writeFileSync(out, `${content}\n`, 'utf8');
    lastIndexFileContents = content;
  }
  return out;
}
