import type { FileFormatState, IdentifierMetadataForPreference } from '@transcend-io/sdk';

/**
 * Helper function to get unique identifier name present in a row
 *
 * @param options - Options
 * @param options.row - The current row from CSV file
 * @param options.columnToIdentifier - The column to identifier mapping metadata
 * @returns The unique identifier names present in the row
 */
export function getUniquePreferenceIdentifierNamesFromRow({
  row,
  columnToIdentifier,
}: {
  /** The current row from CSV file */
  row: Record<string, string>;
  /** The current file metadata state */
  columnToIdentifier: FileFormatState['columnToIdentifier'];
}): (IdentifierMetadataForPreference & {
  /** Column name */
  columnName: string;
  /** Value of the identifier in the row */
  value: string;
})[] {
  return Object.entries(columnToIdentifier)
    .sort(
      ([, a], [, b]) =>
        (a.name === 'email' ? -1 : 0) - (b.name === 'email' ? -1 : 0) ||
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    )
    .filter(([col]) => row[col] && columnToIdentifier[col].isUniqueOnPreferenceStore)
    .map(([col, identifier]) => ({
      ...identifier,
      columnName: col,
      value: row[col],
    }));
}
