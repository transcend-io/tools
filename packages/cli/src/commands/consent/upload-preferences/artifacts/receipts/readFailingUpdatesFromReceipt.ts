import * as nodeFs from 'node:fs';

import type { FailingUpdateRow } from '..';

/** Dependencies used to read failing updates from a receipt. */
export interface ReadFailingUpdatesFromReceiptDependencies {
  /** Filesystem operation used to read the receipt. */
  filesystem?: Pick<typeof nodeFs, 'readFileSync'>;
}

/**
 * Parse failing updates out of a receipts.json file.
 * Returns rows you can merge into your in-memory buffer.
 *
 * @param receiptPath - The path to the receipts.json file
 * @param sourceFile - Optional source file for context
 * @param dependencies - Optional runtime dependencies
 * @returns An array of FailingUpdateRow objects
 */
export function readFailingUpdatesFromReceipt(
  receiptPath: string,
  sourceFile?: string,
  dependencies: ReadFailingUpdatesFromReceiptDependencies = {},
): FailingUpdateRow[] {
  try {
    const raw = (dependencies.filesystem ?? nodeFs).readFileSync(receiptPath, 'utf8');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = JSON.parse(raw) as any;
    const failing = json?.failingUpdates ?? {};
    const out: FailingUpdateRow[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const [primaryKey, val] of Object.entries<any>(failing)) {
      out.push({
        primaryKey,
        uploadedAt: val?.uploadedAt ?? '',
        error: val?.error ?? '',
        updateJson: val?.update ? JSON.stringify(val.update) : '',
        sourceFile,
      });
    }
    return out;
  } catch {
    return [];
  }
}
