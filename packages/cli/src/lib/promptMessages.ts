/** Prompt message for mapping a CSV column to a DSR field */
export const chooseColumnForField = (field: string): string =>
  `Choose the column that will be used to map in the field: ${field}`;

/** Prompt message for mapping a CSV column to a request attribute */
export const chooseColumnForAttribute = (name: string): string =>
  `Choose the column that will be used to map in the attribute: ${name}`;

/** Prompt message for mapping a CSV column to a request identifier */
export const chooseColumnForIdentifier = (name: string): string =>
  `Choose the column that will be used to map in the identifier: ${name}`;

/** Prompt message for mapping a CSV value to an enum */
export const mapValueOf = (value: string): string => `Map value of: ${value}`;

/** Prompt message for choosing a column to filter imported requests */
export const chooseFilterColumn = (rowCount: number): string =>
  `If you need to filter the list of requests to import, choose the column to filter on. Currently ${rowCount} rows.`;

/** Prompt message for selecting values to keep when filtering rows */
export const keepRowsMatchingValue = 'Keep rows matching this value';

/** Prompt message for choosing the consent preference identifier column */
export const chooseIdentifierColumn =
  'Choose the column that will be used as the identifier to upload consent preferences by';

/** Prompt message for skipping rows missing an identifier */
export const skipRowsMissingIdentifier = 'Would you like to skip rows missing an identifier?';

/** Prompt message for deduplicating identifiers by latest update */
export const takeLatestUpdate = 'Would you like to automatically take the latest update?';

/** Prompt message for choosing the consent preference timestamp column */
export const chooseTimestampColumn =
  'Choose the column that will be used as the timestamp of last preference update';

/** Prompt message for associating a CSV column with a purpose */
export const choosePurposeForColumn = (col: string): string =>
  `Choose the purpose that column ${col} is associated with`;

/** Prompt message for mapping a CSV value to a purpose value */
export const choosePurposeValue = (value: string, purpose: string): string =>
  `Choose the purpose value for value "${value}" associated with purpose "${purpose}"`;

/** Prompt message for mapping a CSV value to a preference value */
export const choosePreferenceValue = (
  preferenceSlug: string,
  value: string,
  purpose: string,
): string =>
  `Choose the preference value for "${preferenceSlug}" value "${value}" associated with purpose "${purpose}"`;

/** Prompt message for formatting unformatted policy files */
export const formatUnformattedPolicyFiles = 'Format the unformatted policy files listed above?';

/** Prompt message for creating a new policy bundle */
export const createPolicyBundle = (bundleName: string): string =>
  `No policy bundle named "${bundleName}" exists. Create a new bundle and upload its first version?`;
