import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { splitCsvToList } from '@transcend-io/utils';

import type { CookieCsvInput, CookieInput, DataFlowCsvInput, DataFlowInput } from '../../codecs.js';

const OMITTED_CONSENT_CSV_COLUMNS = new Set([
  'ID',
  'Activity',
  'Encounters',
  'Last Seen At',
  'Has Native Do Not Sell/Share Support',
  'IAB USP API Support',
  'Service',
  'Service Description',
  'Website URL',
  'Categories of Recipients',
]);

/**
 * Convert remaining CSV columns into custom attributes.
 *
 * @param columns - Columns not consumed by the native input fields.
 * @returns Custom attribute inputs.
 */
function mapCustomAttributes(
  columns: Record<string, string | undefined>,
): Array<{ key: string; values: string[] }> {
  return Object.entries(columns)
    .filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && !OMITTED_CONSENT_CSV_COLUMNS.has(entry[0]),
    )
    .map(([key, value]) => ({
      key,
      values: splitCsvToList(value),
    }));
}

/**
 * Convert decoded cookie CSV rows into API inputs.
 *
 * @param rows - Decoded cookie CSV rows.
 * @param trackerStatus - Default status for rows without a status.
 * @returns Cookie API inputs.
 */
export function mapCookieCsvRowsToInputs(
  rows: CookieCsvInput[],
  trackerStatus: ConsentTrackerStatus,
): CookieInput[] {
  return rows.map(
    ({
      'Is Regex?': isRegex,
      Notes,
      Purpose,
      Status,
      Owners,
      Teams,
      Name,
      ...rest
    }): CookieInput => ({
      ...(typeof isRegex === 'string' ? { isRegex: isRegex.toLowerCase() === 'true' } : {}),
      name: Name,
      description: Notes,
      trackingPurposes: splitCsvToList(Purpose),
      status: Status || trackerStatus,
      owners: Owners ? splitCsvToList(Owners) : undefined,
      teams: Teams ? splitCsvToList(Teams) : undefined,
      attributes: mapCustomAttributes(rest),
    }),
  );
}

/**
 * Convert decoded data flow CSV rows into API inputs.
 *
 * @param rows - Decoded data flow CSV rows.
 * @param trackerStatus - Default status for rows without a status.
 * @returns Data flow API inputs.
 */
export function mapDataFlowCsvRowsToInputs(
  rows: DataFlowCsvInput[],
  trackerStatus: ConsentTrackerStatus,
): DataFlowInput[] {
  return rows.map(
    ({
      Type,
      Notes,
      Purpose,
      Status,
      Owners,
      Teams,
      'Connections Made To': value,
      ...rest
    }): DataFlowInput => ({
      value,
      type: Type,
      description: Notes,
      trackingPurposes: splitCsvToList(Purpose),
      status: Status || trackerStatus,
      owners: Owners ? splitCsvToList(Owners) : undefined,
      teams: Teams ? splitCsvToList(Teams) : undefined,
      attributes: mapCustomAttributes(rest),
    }),
  );
}
