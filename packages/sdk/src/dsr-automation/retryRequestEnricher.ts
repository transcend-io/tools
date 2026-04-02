import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { RETRY_REQUEST_ENRICHER } from './gqls/requestEnricher.js';

/**
 * Retry a request enricher
 *
 * @param client - GraphQL client
 * @param id - The ID of the request enricher to restart
 * @param options - Options
 */
export async function retryRequestEnricher(
  client: GraphQLClient,
  id: string,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { logger } = options;
  await makeGraphQLRequest(client, RETRY_REQUEST_ENRICHER, {
    variables: { requestEnricherId: id },
    logger,
  });
}
