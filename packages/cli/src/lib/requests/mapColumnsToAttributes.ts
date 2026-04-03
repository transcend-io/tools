import { select } from '@inquirer/prompts';
import type { PersistedState } from '@transcend-io/persisted-state';
import type { GraphQLClient } from 'graphql-request';

import { AttributeKey } from '../graphql/index.js';
import { CachedFileState } from './constants.js';
import { fuzzyMatchColumns } from './fuzzyMatchColumns.js';

/**
 * Mapping from attribute name to request input parameter
 */
export type AttributeNameMap = {
  [k in string]: string;
};

/**
 * Create a mapping from the attributes names that can be included
 * at request submission, to the names of the columns that map to those
 * attributes.
 *
 * @param client - GraphQL client
 * @param columnNames - The set of all column names
 * @param state - Cached state of this mapping
 * @param requestAttributeKeys - Attribute keys to map
 * @returns Mapping from attributes name to column name
 */
export async function mapColumnsToAttributes(
  client: GraphQLClient,
  columnNames: string[],
  state: PersistedState<typeof CachedFileState>,
  requestAttributeKeys: AttributeKey[],
): Promise<AttributeNameMap> {
  // Determine the columns that should be mapped
  const columnQuestions = requestAttributeKeys.filter(
    ({ name }) => !state.getValue('attributeNames', name),
  );

  // Skip mapping when everything is mapped
  const attributeNameMap: Record<string, string> = {};
  for (const { name } of columnQuestions) {
    const matches = fuzzyMatchColumns(columnNames, name, false);
    attributeNameMap[name] = await select<string>({
      message: `Choose the column that will be used to map in the attribute: ${name}`,
      default: matches.find((m): m is string => typeof m === 'string'),
      choices: matches,
    });
  }

  await Promise.all(
    Object.entries(attributeNameMap).map(([k, v]) => state.setValue(v, 'attributeNames', k)),
  );

  return {
    ...state.getValue('attributeNames'),
    ...attributeNameMap,
  };
}
