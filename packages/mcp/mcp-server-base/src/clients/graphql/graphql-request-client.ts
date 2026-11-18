import { GraphQLClient } from 'graphql-request';

import type { TranscendGraphQLBase } from './base.js';

/** Per-request timeout. Matches the default in `TranscendGraphQLBase.makeRequest`. */
export const GRAPHQL_REQUEST_TIMEOUT_MS = 30_000;

/** `fetch` that aborts each request after {@link GRAPHQL_REQUEST_TIMEOUT_MS}. */
const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(GRAPHQL_REQUEST_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};

/**
 * Builds a `graphql-request` client from an MCP GraphQL client, for SDK
 * functions that take a `GraphQLClient`.
 *
 * Headers come from the call's effective auth (bearer token or session cookie
 * plus organization id) and the MCP attribution headers. Auth can differ per
 * HTTP request, so build a new client inside each tool handler. Do not cache it.
 *
 * Each request times out after 30 seconds, so a stalled backend cannot hold a
 * shared HTTP worker. Retries stay with the SDK's `makeGraphQLRequest`.
 *
 * @param graphql - MCP GraphQL client that holds the base URL and auth
 * @returns GraphQL client bound to the current call's credentials
 * @throws ToolError when no authentication is configured
 */
export function createGraphqlRequestClient(graphql: TranscendGraphQLBase): GraphQLClient {
  return new GraphQLClient(`${graphql.getBaseUrl()}/graphql`, {
    headers: graphql.requestHeaders(),
    fetch: fetchWithTimeout,
  });
}
