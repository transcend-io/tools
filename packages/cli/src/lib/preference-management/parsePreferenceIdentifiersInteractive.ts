import type { PersistedState } from '@transcend-io/persisted-state';
import type { Identifier } from '@transcend-io/sdk';
import type { FileFormatState } from '@transcend-io/sdk';
import Bluebird from 'bluebird';
import colors from 'colors';
import inquirer from 'inquirer';
import { uniq, keyBy } from 'lodash-es';

import { logger } from '../../logger.js';
import { inquirerConfirmBoolean } from '../helpers/index.js';

const { mapSeries } = Bluebird;

/* eslint-disable no-param-reassign */

/**
 * Parse identifiers from a CSV list of preferences
 *
 * Ensures that all rows have a valid identifier
 * and that all identifiers are unique.
 *
 * @param preferences - List of preferences
 * @param options - Options
 * @returns The updated file metadata state
 */
export async function parsePreferenceIdentifiersFromCsv(
  preferences: Record<string, string>[],
  {
    schemaState,
    orgIdentifiers,
    allowedIdentifierNames,
    identifierColumns,
    nonInteractive = false,
  }: {
    /** The current state of the schema metadata */
    schemaState: PersistedState<typeof FileFormatState>;
    /** The list of identifiers configured for the org */
    orgIdentifiers: Identifier[];
    /** The list of identifier names that are allowed for this upload */
    allowedIdentifierNames: string[];
    /** The columns in the CSV that should be used as identifiers */
    identifierColumns: string[];
    /** When true, throw instead of prompting (for worker processes) */
    nonInteractive?: boolean;
  },
): Promise<{
  /** The updated state */
  schemaState: PersistedState<typeof FileFormatState>;
  /** The updated preferences */
  preferences: Record<string, string>[];
}> {
  const columnNames = uniq(preferences.map((x) => Object.keys(x)).flat()).filter((col) =>
    identifierColumns.includes(col),
  );
  const orgIdentifiersByName = keyBy(orgIdentifiers, 'name');
  const filteredOrgIdentifiers = allowedIdentifierNames
    .map((name) => orgIdentifiersByName[name])
    .filter(Boolean);
  if (filteredOrgIdentifiers.length !== allowedIdentifierNames.length) {
    const missingIdentifiers = allowedIdentifierNames.filter((name) => !orgIdentifiersByName[name]);
    throw new Error(`No identifier configuration found for "${missingIdentifiers.join('","')}"`);
  }
  if (columnNames.length !== identifierColumns.length) {
    const missingColumns = identifierColumns.filter((col) => !columnNames.includes(col));
    throw new Error(
      `The following identifier columns are missing from the CSV: "${missingColumns.join('","')}"`,
    );
  }

  if (
    filteredOrgIdentifiers.filter((identifier) => identifier.isUniqueOnPreferenceStore).length === 0
  ) {
    throw new Error(
      'No unique identifier was provided. Please ensure that at least one ' +
        'of the allowed identifiers is configured as unique on the preference store.',
    );
  }

  const currentColumnToIdentifier = schemaState.getValue('columnToIdentifier');
  await mapSeries(identifierColumns, async (col) => {
    const identifierMapping = currentColumnToIdentifier[col];
    if (identifierMapping) {
      logger.info(
        colors.magenta(`Column "${col}" is associated with identifier "${identifierMapping.name}"`),
      );
      return;
    }

    if (nonInteractive) {
      throw new Error(
        `Column "${col}" has no identifier mapping in the config. ` +
          "Run 'transcend consent configure-preference-upload' to update the config.",
      );
    }

    const { identifierName } = await inquirer.prompt<{
      identifierName: string;
    }>([
      {
        name: 'identifierName',
        message: `Choose the identifier name for column "${col}"`,
        type: 'list',
        default: allowedIdentifierNames.find((x) => x.startsWith(col)),
        choices: allowedIdentifierNames,
      },
    ]);
    currentColumnToIdentifier[col] = {
      name: identifierName,
      isUniqueOnPreferenceStore: orgIdentifiersByName[identifierName].isUniqueOnPreferenceStore,
    };
  });
  schemaState.setValue(currentColumnToIdentifier, 'columnToIdentifier');

  const uniqueIdentifierColumns = Object.entries(currentColumnToIdentifier)
    .filter(([, identifierMapping]) => identifierMapping.isUniqueOnPreferenceStore)
    .map(([col]) => col);

  const uniqueIdentifierMissingIndexes = preferences
    .map((pref, ind) => (uniqueIdentifierColumns.some((col) => !!pref[col]) ? null : [ind]))
    .filter((x): x is number[] => !!x)
    .flat();

  if (uniqueIdentifierMissingIndexes.length > 0) {
    const msg = `
    The following rows ${uniqueIdentifierMissingIndexes.join(
      ', ',
    )} do not have any unique identifier values for the columns "${uniqueIdentifierColumns.join(
      '", "',
    )}".`;
    logger.warn(colors.yellow(msg));

    if (nonInteractive) {
      throw new Error(msg);
    }

    const skip = await inquirerConfirmBoolean({
      message: 'Would you like to skip rows missing unique identifiers?',
    });
    if (!skip) {
      throw new Error(msg);
    }

    const previous = preferences.length;
    preferences = preferences.filter(
      (pref, index) => !uniqueIdentifierMissingIndexes.includes(index),
    );
    logger.info(
      colors.yellow(`Skipped ${previous - preferences.length} rows missing unique identifiers`),
    );
  }
  logger.info(
    colors.magenta(
      `At least one unique identifier column is present for all ${preferences.length} rows.`,
    ),
  );

  return { schemaState, preferences };
}
/* eslint-enable no-param-reassign */
