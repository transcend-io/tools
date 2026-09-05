import type { PersistedState } from '@transcend-io/persisted-state';
import { INITIALIZER, type Initializer, makeGraphQLRequest } from '@transcend-io/sdk';
import type { GraphQLClient } from 'graphql-request';

import type { CliLogger } from '../../context.js';
import { logger } from '../../logger.js';
import { CachedFileState, IDENTIFIER_BLOCK_LIST } from './constants.js';
import { fuzzyMatchColumns } from './fuzzyMatchColumns.js';
import { prompt, type RequestPrompt } from './prompt.js';

/**
 * Mapping from identifier name to request input parameter
 */
export type IdentifierNameMap = {
  [k in string]: string;
};

/** Runtime dependencies used while mapping identifier columns. */
export interface MapColumnsToIdentifiersDependencies {
  /** Logger forwarded to GraphQL requests. */
  readonly logger: CliLogger;
  /** Prompt capability used to collect identifier mappings. */
  readonly prompt: RequestPrompt;
}

const defaultDependencies: MapColumnsToIdentifiersDependencies = {
  logger,
  prompt,
};

/**
 * Create a mapping from the identifier names that can be included
 * at request submission, to the names of the columns that map to those
 * identifiers.
 *
 * @param client - GraphQL client
 * @param columnNames - The set of all column names
 * @param state - Cached state of this mapping
 * @param dependencies - Runtime dependencies.
 * @returns Mapping from identifier name to column name
 */
export async function mapColumnsToIdentifiers(
  client: GraphQLClient,
  columnNames: string[],
  state: PersistedState<typeof CachedFileState>,
  dependencies: MapColumnsToIdentifiersDependencies = defaultDependencies,
): Promise<IdentifierNameMap> {
  // Grab the initializer
  const { initializer } = await makeGraphQLRequest<{
    /** Query response */
    initializer: Initializer;
  }>(client, INITIALIZER, { logger: dependencies.logger });

  // Determine the columns that should be mapped
  const columnQuestions = initializer.identifiers.filter(
    ({ name }) => !state.getValue('identifierNames', name) && !IDENTIFIER_BLOCK_LIST.includes(name),
  );

  // Skip mapping when everything is mapped
  const identifierNameMap =
    columnQuestions.length === 0
      ? {}
      : // prompt questions to map columns
        await dependencies.prompt<{
          [k in string]: string;
        }>(
          columnQuestions.map(({ name }) => {
            const matches = fuzzyMatchColumns(columnNames, name, false);
            return {
              name,
              message: `Choose the column that will be used to map in the identifier: ${name}`,
              type: 'list',
              default: matches[0],
              choices: matches,
            };
          }),
        );
  await Promise.all(
    Object.entries(identifierNameMap).map(([k, v]) => state.setValue(v, 'identifierNames', k)),
  );

  return {
    ...state.getValue('identifierNames'),
    ...identifierNameMap,
  };
}
