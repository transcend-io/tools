import type { PreferenceStoreIdentifier } from '@transcend-io/privacy-types';
import type { FileFormatState } from '@transcend-io/sdk';

/**
 * Helper function to get the identifiers payload from a row
 *
 * @param options - Options
 * @param options.row - The current row from CSV file
 * @param options.columnToIdentifier - The column to identifier mapping metadata
 * @returns The updated preferences with identifiers payload
 */
export function getPreferenceIdentifiersFromRow({
  row,
  columnToIdentifier,
}: {
  /** The current row from CSV file */
  row: Record<string, string>;
  /** The current file metadata state */
  columnToIdentifier: FileFormatState['columnToIdentifier'];
}): PreferenceStoreIdentifier[] {
  const identifiers = Object.entries(columnToIdentifier)
    .filter(([col]) => !!row[col])
    .map(([col, identifierMapping]) => ({
      name: identifierMapping.name,
      value: row[col],
    }));
  return identifiers.sort(
    (a, b) =>
      (a.name === 'email' ? -1 : 0) - (b.name === 'email' ? -1 : 0) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}
