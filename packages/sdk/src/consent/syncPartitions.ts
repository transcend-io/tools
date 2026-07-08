import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { difference } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchConsentManagerId } from './fetchConsentManagerId.js';
import {
  CONSENT_PARTITIONS,
  CREATE_CONSENT_PARTITION,
  type TranscendConsentPartitionGql,
  type TranscendCliConsentPartitionsResponse,
} from './gqls/partitions.js';

const PAGE_SIZE = 50;

export interface PartitionInput {
  /** Name of partition */
  name: string;
  /** Value of partition, cannot be pushed, can only be pulled */
  partition?: string;
}

/**
 * Fetch the list of partitions
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Partition list
 */
export async function fetchPartitions(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<TranscendConsentPartitionGql[]> {
  const { logger = NOOP_LOGGER } = options;
  const partitions: TranscendConsentPartitionGql[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      consentPartitions: { nodes },
    } = await makeGraphQLRequest<TranscendCliConsentPartitionsResponse>(
      client,
      CONSENT_PARTITIONS,
      {
        variables: { first: PAGE_SIZE, offset },
        logger,
      },
    );
    partitions.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return partitions.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Sync the consent partitions
 *
 * @param client - GraphQL client
 * @param partitionInputs - The partition inputs
 * @param options - Options
 * @returns True on success
 */
export async function syncPartitions(
  client: GraphQLClient,
  partitionInputs: PartitionInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<boolean> {
  const { logger = NOOP_LOGGER } = options;
  const airgapBundleId = await fetchConsentManagerId(client, { logger });
  let encounteredError = false;
  const partitions = await fetchPartitions(client, { logger });
  const newPartitionNames = difference(
    partitionInputs.map(({ name }) => name),
    partitions.map(({ name }) => name),
  );
  await mapSeries(newPartitionNames, async (name) => {
    try {
      await makeGraphQLRequest(client, CREATE_CONSENT_PARTITION, {
        variables: {
          input: {
            id: airgapBundleId,
            name,
          },
        },
        logger,
      });
      logger.info(`Successfully created consent partition: ${name}!`);
    } catch (err) {
      logger.error(`Failed to create consent partition: ${name}! - ${(err as Error).message}`);
      encounteredError = true;
    }
  });
  return !encounteredError;
}
