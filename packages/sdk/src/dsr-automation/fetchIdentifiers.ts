import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy, uniq, flatten, difference } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllIdentifiers, type Identifier } from '../data-inventory/fetchAllIdentifiers.js';
import { CREATE_IDENTIFIER, NEW_IDENTIFIER_TYPES } from './gqls/dsrIdentifier.js';

export interface IdentifiersAndCreateMissingInput {
  /** Enricher configurations */
  enrichers?: {
    /** Input identifier name */
    'input-identifier'?: string;
    /** Output identifier names */
    'output-identifiers': string[];
  }[];
  /** Data silo configurations */
  'data-silos'?: {
    /** Identity keys */
    'identity-keys'?: string[];
  }[];
  /** Identifier configurations */
  identifiers?: {
    /** Identifier name */
    name: string;
  }[];
}

/**
 * Fetch all identifiers and if any are found in the config that are
 * missing, create those identifiers.
 *
 * @param input - Transcend input
 * @param client - GraphQL client
 * @param options - Options
 * @returns A map from identifier name to Identifier
 */
export async function fetchIdentifiersAndCreateMissing(
  input: IdentifiersAndCreateMissingInput,
  client: GraphQLClient,
  options: {
    /** When true, skip publishing to privacy center */
    skipPublish?: boolean;
    /** Logger instance */
    logger: Logger;
  },
): Promise<{ [k in string]: Identifier }> {
  const { enrichers = [], 'data-silos': dataSilos = [], identifiers = [] } = input;
  const { skipPublish = false, logger } = options;
  const allIdentifiers = await fetchAllIdentifiers(client, { logger });
  const identifiersByName = keyBy(allIdentifiers, 'name');

  const expectedIdentifiers = uniq([
    ...flatten(
      enrichers.map((enricher) => [
        enricher['input-identifier'],
        ...enricher['output-identifiers'],
      ]),
    ),
    ...flatten(dataSilos.map((dataSilo) => dataSilo['identity-keys'])),
    ...identifiers.map(({ name }) => name),
  ]).filter((x) => !!x);
  const missingIdentifiers = difference(
    expectedIdentifiers,
    allIdentifiers.map(({ name }) => name),
  );

  if (missingIdentifiers.length > 0) {
    logger.info(`Creating ${missingIdentifiers.length} new identifiers...`);
    const { newIdentifierTypes } = await makeGraphQLRequest<{
      /** Query response */
      newIdentifierTypes: {
        /** Name of identifier type remaining */
        name: string;
      }[];
    }>(client, NEW_IDENTIFIER_TYPES, { logger });
    const nativeTypesRemaining = newIdentifierTypes.map(({ name }) => name);
    await mapSeries(missingIdentifiers, async (identifier) => {
      logger.info(`Creating identifier ${identifier}...`);
      try {
        const { createIdentifier } = await makeGraphQLRequest<{
          /** createIdentifier Response */
          createIdentifier: {
            /** Created identifier */
            identifier: Identifier;
          };
        }>(client, CREATE_IDENTIFIER, {
          variables: {
            input: {
              name: identifier,
              type: nativeTypesRemaining.includes(identifier!) ? identifier : 'custom',
              skipPublish,
            },
          },
          logger,
        });
        logger.info(`Created identifier ${identifier}!`);

        identifiersByName[identifier!] = createIdentifier.identifier;
      } catch (err) {
        logger.error(`Failed to create identifier "${identifier}" - ${(err as Error).message}`);
      }
    });
  }
  return identifiersByName;
}
