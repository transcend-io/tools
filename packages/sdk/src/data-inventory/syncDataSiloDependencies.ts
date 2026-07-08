import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { chunk } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import type { DataSilo } from './fetchAllDataSilos.js';
import { UPDATE_DATA_SILOS } from './gqls/dataSilo.js';

const BATCH_SILOS_LIMIT = 20;

/**
 * Sync data silo dependencies
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns True upon success
 */
export async function syncDataSiloDependencies(
  client: GraphQLClient,
  options: {
    /** Pairs of [data silo ID, dependency titles] */
    input: [string, string[]][];
    /** Logger instance */
    logger?: Logger;
  },
): Promise<boolean> {
  const { input: dependencyUpdates, logger = NOOP_LOGGER } = options;
  let encounteredError = false;
  logger.info(`Syncing "${dependencyUpdates.length}" data silo dependencies...`);

  const chunkedUpdates = chunk(dependencyUpdates, BATCH_SILOS_LIMIT);
  await mapSeries(chunkedUpdates, async (dependencyUpdateChunk, ind) => {
    logger.info(
      `[Batch ${ind}/${dependencyUpdateChunk.length}] Updating "${dependencyUpdateChunk.length}" data silos...`,
    );
    try {
      await makeGraphQLRequest<{
        /** Mutation result */
        updateDataSilos: {
          /** New data silos */
          dataSilos: Pick<DataSilo, 'id' | 'title'>[];
        };
      }>(client, UPDATE_DATA_SILOS, {
        variables: {
          input: {
            dataSilos: dependencyUpdateChunk.map(([id, dependedOnDataSiloTitles]) => ({
              id,
              dependedOnDataSiloTitles,
            })),
          },
        },
        logger,
      });
      logger.info(
        `[Batch ${ind + 1}/${dependencyUpdateChunk.length}] ` +
          `Synced "${dependencyUpdateChunk.length}" data silos!`,
      );
    } catch (err) {
      encounteredError = true;
      logger.error(
        `[Batch ${ind + 1}/${dependencyUpdateChunk.length}] ` +
          `Failed to update "${dependencyUpdateChunk.length}" silos! - ${(err as Error).message}`,
      );
    }
  });
  return !encounteredError;
}
