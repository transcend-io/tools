import type { PreferenceStoreIdentifier } from '@transcend-io/privacy-types';

import type { FileFormatState } from './codecs.js';

/**
 * Extract preference store identifiers from a CSV row based on the column-to-identifier mapping.
 *
 * @param options - Options
 * @returns Array of identifiers for the preference store API
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
      value: row[col]!,
    }));
  return identifiers.sort(
    (a, b) =>
      (a.name === 'email' ? -1 : 0) - (b.name === 'email' ? -1 : 0) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

/** Sentinel value indicating no timestamp/format column was selected */
export const NONE_PREFERENCE_MAP = '[NONE]';
