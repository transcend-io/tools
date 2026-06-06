import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { RETRY_REQUEST_ENRICHER } from './gqls/requestEnricher.js';

/**
 * Retry a request enricher
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function retryRequestEnricher(
  client: GraphQLClient,
  options: {
    /** The ID of the request enricher to restart */
    id: string;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<void> {
  const { id, logger = NOOP_LOGGER } = options;
  await makeGraphQLRequest(client, RETRY_REQUEST_ENRICHER, {
    variables: { requestEnricherId: id },
    logger,
  });
}
