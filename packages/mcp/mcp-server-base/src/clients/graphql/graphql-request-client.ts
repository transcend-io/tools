import { GraphQLClient } from 'graphql-request';

import type { TranscendGraphQLBase } from './base.js';

/**
 * Builds a `graphql-request` client from an MCP GraphQL client, for SDK
 * functions that take a `GraphQLClient`.
 *
 * Headers come from the call's effective auth (bearer token or session cookie
 * plus organization id) and the MCP attribution headers. Auth can differ per
 * HTTP request, so build a new client inside each tool handler. Do not cache it.
 *
 * @param graphql - MCP GraphQL client that holds the base URL and auth
 * @returns GraphQL client bound to the current call's credentials
 * @throws ToolError when no authentication is configured
 */
export function createGraphqlRequestClient(graphql: TranscendGraphQLBase): GraphQLClient {
  return new GraphQLClient(`${graphql.getBaseUrl()}/graphql`, {
    headers: graphql.requestHeaders(),
  });
}
