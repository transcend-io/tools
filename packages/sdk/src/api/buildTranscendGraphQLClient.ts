import { GraphQLClient } from 'graphql-request';

/**
 * Create a GraphQL client
 *
 * @param transcendUrl - Transcend API URL
 * @param headers - Request headers to include in each request
 * @param version - Optional version string to include in request headers
 * @returns GraphQL client
 */
export function buildTranscendGraphQLClientGeneric(
  transcendUrl: string,
  headers: Record<string, string>,
  version?: string,
): GraphQLClient {
  return new GraphQLClient(`${transcendUrl}/graphql`, {
    headers: {
      ...headers,
      ...(version ? { version } : {}),
    },
  });
}

/**
 * Create a GraphQL client capable of submitting requests with an API key
 *
 * @param transcendUrl - Transcend API URL
 * @param auth - API key to authenticate to API
 * @param version - Optional version string to include in request headers
 * @returns GraphQL client
 */
export function buildTranscendGraphQLClient(
  transcendUrl: string,
  auth: string,
  version?: string,
): GraphQLClient {
  return buildTranscendGraphQLClientGeneric(
    transcendUrl,
    { Authorization: `Bearer ${auth}` },
    version,
  );
}
