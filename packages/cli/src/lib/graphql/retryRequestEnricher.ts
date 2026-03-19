import { GraphQLClient } from 'graphql-request';

import { RETRY_REQUEST_ENRICHER } from './gqls/index.js';
import { makeGraphQLRequest } from './makeGraphQLRequest.js';

/**
 * Retry a request enricher
 *
 * @param client - GraphQL client
 * @param id - The ID of the request enricher to restart
 */
export async function retryRequestEnricher(client: GraphQLClient, id: string): Promise<void> {
  await makeGraphQLRequest(client, RETRY_REQUEST_ENRICHER, {
    requestEnricherId: id,
  });
}
