import {
  fetchAllIdentifiers as sdkFetchAllIdentifiers,
  makeGraphQLRequest,
  type Identifier,
} from '@transcend-io/sdk';
import { mapSeries } from '@transcend-io/utils';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { keyBy, uniq, flatten, difference } from 'lodash-es';

import { TranscendInput } from '../../codecs.js';
import { logger } from '../../logger.js';
import { CREATE_IDENTIFIER, NEW_IDENTIFIER_TYPES } from './gqls/index.js';

/**
 * Fetch all identifiers and if any are found in the config that are
 * missing, create those identifiers.
 *
 * @param input - Transcend input
 * @param client - GraphQL client
 * @param skipPublish - When true, skip publishing to privacy center
 * @returns A map from identifier name to Identifier
 */
export async function fetchIdentifiersAndCreateMissing(
  { enrichers = [], 'data-silos': dataSilos = [], identifiers = [] }: TranscendInput,
  client: GraphQLClient,
  skipPublish = false,
): Promise<{ [k in string]: Identifier }> {
  const allIdentifiers = await sdkFetchAllIdentifiers(client, { logger });
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
    logger.info(colors.magenta(`Creating ${missingIdentifiers.length} new identifiers...`));
    const { newIdentifierTypes } = await makeGraphQLRequest<{
      /** Query response */
      newIdentifierTypes: {
        /** Name of identifier type remaining */
        name: string;
      }[];
    }>(client, NEW_IDENTIFIER_TYPES, { logger });
    const nativeTypesRemaining = newIdentifierTypes.map(({ name }) => name);
    await mapSeries(missingIdentifiers, async (identifier) => {
      logger.info(colors.magenta(`Creating identifier ${identifier}...`));
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
      logger.info(colors.green(`Created identifier ${identifier}!`));

      identifiersByName[identifier!] = createIdentifier.identifier;
    });
  }
  return identifiersByName;
}
