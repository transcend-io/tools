import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { chunk } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import type { DataSilo } from './fetchAllDataSilos.js';
import { UPDATE_DATA_SILOS } from './gqls/dataSilo.js';

const BATCH_SILOS_LIMIT = 20;

/**
 * A set of data silos that another data silo depends on during an erasure request,
 * either globally or scoped to a single erasure workflow.
 */
export interface DependedOnDataSiloInput {
  /** IDs of the data silos depended on */
  ids?: string[];
  /** Titles of the data silos depended on */
  titles?: string[];
  /** ID of the workflow config this override applies to. Omit for the global configuration */
  workflowConfigId?: string;
  /** Internal name of the workflow config this override applies to. Omit for the global configuration */
  workflowConfigInternalName?: string;
  /** Clear the workflow-scoped override so the data silo falls back to the global configuration */
  resetToGlobal?: boolean;
}

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
    /** Pairs of [data silo ID, dependency entries] */
    input: [string, DependedOnDataSiloInput[]][];
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
            dataSilos: dependencyUpdateChunk.map(([id, dependedOnDataSilos]) => ({
              id,
              dependedOnDataSilos,
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
