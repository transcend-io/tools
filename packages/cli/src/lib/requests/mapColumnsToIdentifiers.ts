import { select } from '@inquirer/prompts';
import type { PersistedState } from '@transcend-io/persisted-state';
import { makeGraphQLRequest } from '@transcend-io/sdk';
import type { GraphQLClient } from 'graphql-request';

import { logger } from '../../logger.js';
import { INITIALIZER, Initializer } from '../graphql/index.js';
import { CachedFileState, IDENTIFIER_BLOCK_LIST } from './constants.js';
import { fuzzyMatchColumns } from './fuzzyMatchColumns.js';

/**
 * Mapping from identifier name to request input parameter
 */
export type IdentifierNameMap = {
  [k in string]: string;
};

/**
 * Create a mapping from the identifier names that can be included
 * at request submission, to the names of the columns that map to those
 * identifiers.
 *
 * @param client - GraphQL client
 * @param columnNames - The set of all column names
 * @param state - Cached state of this mapping
 * @returns Mapping from identifier name to column name
 */
export async function mapColumnsToIdentifiers(
  client: GraphQLClient,
  columnNames: string[],
  state: PersistedState<typeof CachedFileState>,
): Promise<IdentifierNameMap> {
  // Grab the initializer
  const { initializer } = await makeGraphQLRequest<{
    /** Query response */
    initializer: Initializer;
  }>(client, INITIALIZER, { logger });

  // Determine the columns that should be mapped
  const columnQuestions = initializer.identifiers.filter(
    ({ name }) => !state.getValue('identifierNames', name) && !IDENTIFIER_BLOCK_LIST.includes(name),
  );

  // Skip mapping when everything is mapped
  const identifierNameMap: Record<string, string> = {};
  for (const { name } of columnQuestions) {
    const matches = fuzzyMatchColumns(columnNames, name, false);
    identifierNameMap[name] = await select<string>({
      message: `Choose the column that will be used to map in the identifier: ${name}`,
      default: matches.find((m): m is string => typeof m === 'string'),
      choices: matches,
    });
  }

  await Promise.all(
    Object.entries(identifierNameMap).map(([k, v]) => state.setValue(v, 'identifierNames', k)),
  );

  return {
    ...state.getValue('identifierNames'),
    ...identifierNameMap,
  };
}
