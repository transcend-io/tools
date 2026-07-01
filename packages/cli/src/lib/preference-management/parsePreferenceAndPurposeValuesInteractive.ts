import type { PersistedState } from '@transcend-io/persisted-state';
import { PreferenceTopicType } from '@transcend-io/privacy-types';
import type { PreferenceTopic } from '@transcend-io/sdk';
import { FileFormatState } from '@transcend-io/sdk';
import { mapSeries } from '@transcend-io/utils';
import { splitCsvToList } from '@transcend-io/utils';
import colors from 'colors';
import inquirer from 'inquirer';
import { uniq, difference } from 'lodash-es';

import { logger } from '../../logger.js';

/** Values that clearly mean "no preference recorded" and should map to null. */
const NULL_VALUES = new Set(['', 'undefined', 'null', 'none', 'n/a', 'na']);

const FALSY_VALUES = new Set([
  'false',
  '0',
  'no',
  'n',
  'off',
  'opt-out',
  'optout',
  'opt_out',
  'unsubscribed',
]);

/**
 * Check whether a raw CSV value represents "no data" and should map to null.
 *
 * @param value - raw CSV cell value
 * @returns true when the value should be treated as null (no preference)
 */
function looksNull(value: string): boolean {
  return NULL_VALUES.has(value.trim().toLowerCase());
}

/**
 * Infer a sensible Y/n default for a purpose/preference value prompt.
 *
 * @param value - raw CSV cell value
 * @returns true when the value looks like "opted-in"
 */
function looksOptedIn(value: string): boolean {
  return !FALSY_VALUES.has(value.trim().toLowerCase()) && !looksNull(value);
}

/**
 * Parse out the purpose.enabled and preference values from a CSV file
 *
 * @param preferences - List of preferences
 * @param schemaState - The schema state to use for parsing the file
 * @param options - Options
 * @returns The updated file metadata state
 */
export async function parsePreferenceAndPurposeValuesFromCsv(
  preferences: Record<string, string>[],
  schemaState: PersistedState<typeof FileFormatState>,
  {
    purposeSlugs,
    preferenceTopics,
    forceTriggerWorkflows,
    columnsToIgnore,
    nonInteractive = false,
  }: {
    /** The purpose slugs that are allowed to be updated */
    purposeSlugs: string[];
    /** The preference topics */
    preferenceTopics: PreferenceTopic[];
    /** Force workflow triggers */
    forceTriggerWorkflows: boolean;
    /** Columns to ignore in the CSV file */
    columnsToIgnore: string[];
    /** When true, throw instead of prompting (for worker processes) */
    nonInteractive?: boolean;
  },
): Promise<PersistedState<typeof FileFormatState>> {
  const columnNames = uniq(preferences.map((x) => Object.keys(x)).flat());

  const timestampCol = schemaState.getValue('timestampColumn');
  const otherColumns = difference(columnNames, [
    ...Object.keys(schemaState.getValue('columnToIdentifier')),
    ...(timestampCol ? [timestampCol] : []),
    ...columnsToIgnore,
    ...Object.keys(schemaState.getValue('columnToMetadata') ?? {}),
  ]);
  if (otherColumns.length === 0) {
    if (forceTriggerWorkflows) {
      return schemaState;
    }
    throw new Error('No other columns to process');
  }

  const purposeNames = [
    ...purposeSlugs,
    ...preferenceTopics.map((x) => `${x.purpose.trackingType}->${x.slug}`),
  ];

  await mapSeries(otherColumns, async (col) => {
    const uniqueValues = uniq(preferences.map((x) => x[col] ?? ''));

    const currentPurposeMapping = schemaState.getValue('columnToPurposeName');
    let purposeMapping = currentPurposeMapping[col];
    if (purposeMapping) {
      logger.info(
        colors.magenta(`Column "${col}" is associated with purpose "${purposeMapping.purpose}"`),
      );
    } else {
      if (nonInteractive) {
        throw new Error(
          `Column "${col}" has no purpose mapping in the config. ` +
            "Run 'transcend consent configure-preference-upload' to update the config.",
        );
      }

      const { purposeName } = await inquirer.prompt<{
        purposeName: string;
      }>([
        {
          name: 'purposeName',
          message: `Choose the purpose that column ${col} is associated with`,
          type: 'list',
          default: purposeNames.find((x) => x.startsWith(purposeSlugs[0])),
          choices: purposeNames,
        },
      ]);
      const [purposeSlug, preferenceSlug] = purposeName.split('->');
      purposeMapping = {
        purpose: purposeSlug,
        preference: preferenceSlug || null,
        valueMapping: {},
      };
    }

    await mapSeries(uniqueValues, async (value) => {
      if (purposeMapping.valueMapping[value] !== undefined) {
        logger.info(
          colors.magenta(
            `Value "${value}" is associated with purpose value "${purposeMapping.valueMapping[value]}"`,
          ),
        );
        return;
      }

      if (looksNull(value)) {
        logger.info(
          colors.magenta(
            `Value "${value || '(empty)'}" for column "${col}" → null (no preference)`,
          ),
        );
        purposeMapping.valueMapping[value] = null as unknown as boolean;
        return;
      }

      if (nonInteractive) {
        throw new Error(
          `Value "${value}" for column "${col}" has no mapping in the config. ` +
            "Run 'transcend consent configure-preference-upload' to update the config.",
        );
      }

      if (purposeMapping.preference === null) {
        const { purposeValue } = await inquirer.prompt<{
          purposeValue: string;
        }>([
          {
            name: 'purposeValue',
            message: `Map value "${value}" for purpose "${purposeMapping.purpose}"`,
            type: 'list',
            choices: [
              { name: 'true  (opted in)', value: 'true' },
              { name: 'false (opted out)', value: 'false' },
              { name: 'null  (skip / no preference)', value: 'null' },
            ],
            default: looksOptedIn(value) ? 'true' : 'false',
          },
        ]);
        purposeMapping.valueMapping[value] =
          purposeValue === 'null' ? (null as unknown as boolean) : purposeValue === 'true';
      }

      if (purposeMapping.preference !== null) {
        const preferenceTopic = preferenceTopics.find((x) => x.slug === purposeMapping.preference);
        if (!preferenceTopic) {
          logger.error(colors.red(`Preference topic "${purposeMapping.preference}" not found`));
          return;
        }
        const preferenceOptions = preferenceTopic.preferenceOptionValues.map(({ slug }) => slug);

        if (preferenceTopic.type === PreferenceTopicType.Boolean) {
          const { preferenceValue } = await inquirer.prompt<{
            preferenceValue: string;
          }>([
            {
              name: 'preferenceValue',
              message: `Map value "${value}" for preference "${preferenceTopic.slug}" (${purposeMapping.purpose})`,
              type: 'list',
              choices: [
                { name: 'true  (opted in)', value: 'true' },
                { name: 'false (opted out)', value: 'false' },
                { name: 'null  (skip / no preference)', value: 'null' },
              ],
              default: looksOptedIn(value) ? 'true' : 'false',
            },
          ]);
          purposeMapping.valueMapping[value] =
            preferenceValue === 'null' ? (null as unknown as boolean) : preferenceValue === 'true';
          return;
        }

        if (preferenceTopic.type === PreferenceTopicType.Select) {
          const choices = [
            ...preferenceOptions.map((o) => ({ name: o, value: o })),
            { name: '(null — skip / no preference)', value: '__null__' },
          ];
          const { preferenceValue } = await inquirer.prompt<{
            preferenceValue: string;
          }>([
            {
              name: 'preferenceValue',
              message: `Map value "${value}" for preference "${preferenceTopic.slug}" (${purposeMapping.purpose})`,
              type: 'list',
              choices,
              default: preferenceOptions.find((x) => x === value),
            },
          ]);
          purposeMapping.valueMapping[value] =
            preferenceValue === '__null__'
              ? (null as unknown as boolean)
              : (preferenceValue as unknown as boolean);
          return;
        }

        if (preferenceTopic.type === PreferenceTopicType.MultiSelect) {
          const parsedValues = splitCsvToList(value);
          await mapSeries(parsedValues, async (parsedValue) => {
            if (purposeMapping.valueMapping[parsedValue] !== undefined) {
              return;
            }
            const msChoices = [
              ...preferenceOptions.map((o) => ({ name: o, value: o })),
              {
                name: '(null — skip / no preference)',
                value: '__null__',
              },
            ];
            const { preferenceValue } = await inquirer.prompt<{
              preferenceValue: string;
            }>([
              {
                name: 'preferenceValue',
                message: `Map token "${parsedValue}" for preference "${preferenceTopic.slug}" (${purposeMapping.purpose})`,
                type: 'list',
                choices: msChoices,
                default: preferenceOptions.find((x) => x === parsedValue),
              },
            ]);
            purposeMapping.valueMapping[parsedValue] =
              preferenceValue === '__null__'
                ? (null as unknown as boolean)
                : (preferenceValue as unknown as boolean);
          });
          return;
        }

        throw new Error(`Unknown preference topic type: ${preferenceTopic.type}`);
      }
    });
    currentPurposeMapping[col] = purposeMapping;
    schemaState.setValue(currentPurposeMapping, 'columnToPurposeName');
  });

  return schemaState;
}
