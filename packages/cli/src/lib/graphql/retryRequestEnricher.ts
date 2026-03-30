import { makeGraphQLRequest } from '@transcend-io/sdk';
import { GraphQLClient } from 'graphql-request';

import { logger } from '../../logger.js';
import { RETRY_REQUEST_ENRICHER } from './gqls/index.js';

/**
 * Retry a request enricher
 *
 * @param client - GraphQL client
 * @param id - The ID of the request enricher to restart
 */
export async function retryRequestEnricher(client: GraphQLClient, id: string): Promise<void> {
  await makeGraphQLRequest(client, RETRY_REQUEST_ENRICHER, {
    variables: { requestEnricherId: id },
    logger,
  });
}
