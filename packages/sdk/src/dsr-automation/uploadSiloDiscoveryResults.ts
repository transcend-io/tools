import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { chunk } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { ADD_SILO_DISCOVERY_RESULTS } from './gqls/siloDiscovery.js';

export interface SiloDiscoveryRawResult {
  /** The name of the potential data silo entry */
  name: string;
  /** A unique UUID (represents the same resource across different silo discovery runs) */
  resourceId: string;
  /** Any hosts associated with the entry */
  host?: string;
  /** Type of data silo */
  type?: string | undefined;
}

const CHUNK_SIZE = 1000;

/**
 * Uploads silo discovery results for Transcend to classify
 *
 * @param client - GraphQL Client
 * @param pluginId - pluginID to associate with the results
 * @param results - The results
 * @param options - Options
 */
export async function uploadSiloDiscoveryResults(
  client: GraphQLClient,
  input: {
    /** Plugin ID to associate with the results */
    pluginId: string;
    /** The discovery results to upload */
    results: SiloDiscoveryRawResult[];
  },
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<void> {
  const { logger } = options;
  const { pluginId, results } = input;
  const chunks = chunk(results, CHUNK_SIZE);

  await mapSeries(chunks, async (rawResults) => {
    await makeGraphQLRequest<{
      /** Whether we successfully uploaded the results */
      success: boolean;
    }>(client, ADD_SILO_DISCOVERY_RESULTS, {
      variables: { pluginId, rawResults },
      logger,
    });
  });
}
