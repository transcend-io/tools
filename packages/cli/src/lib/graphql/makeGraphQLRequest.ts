import { makeGraphQLRequest as sdkMakeGraphQLRequest } from '@transcend-io/sdk';
import type { GraphQLClient, RequestDocument, Variables } from 'graphql-request';

import { logger } from '../../logger.js';

const MAX_RETRIES = 4;

/**
 * CLI wrapper around the SDK's makeGraphQLRequest.
 * Preserves the legacy positional-arg signature and injects the CLI logger.
 *
 * @param client - GraphQL client
 * @param document - document
 * @param variables - Variable
 * @param requestHeaders - Headers
 * @param maxRequests - Max number of requests
 * @returns Response
 */
export async function makeGraphQLRequest<T, V extends Variables = Variables>(
  client: GraphQLClient,
  document: RequestDocument,
  variables?: V,
  requestHeaders?: Record<string, string> | string[][] | Headers,
  maxRequests = MAX_RETRIES,
): Promise<T> {
  return sdkMakeGraphQLRequest<T, V>(client, document, {
    variables,
    logger,
    requestHeaders,
    maxRetries: maxRequests,
  });
}
