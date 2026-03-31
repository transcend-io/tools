import { ScopeName } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { CREATE_API_KEY, DELETE_API_KEY } from './gqls/apiKey.js';

export interface CreatedApiKey {
  /** ID of API key */
  id: string;
  /** Actual API key */
  apiKey: string;
  /** Title of the API key */
  title: string;
}

/**
 * Create an API key
 *
 * @param client - GraphQL client
 * @param input - Input
 * @param options - Options
 * @returns The API key
 */
export async function createApiKey(
  client: GraphQLClient,
  input: {
    /** Title of API key */
    title: string;
    /** Scopes for API key */
    scopes: ScopeName[];
  },
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<CreatedApiKey> {
  const { logger } = options;
  const {
    createApiKey: { apiKey },
  } = await makeGraphQLRequest<{
    /** Create API key */
    createApiKey: {
      /** API key */
      apiKey: CreatedApiKey;
    };
  }>(client, CREATE_API_KEY, { variables: { input }, logger });

  return apiKey;
}

/**
 * Delete an API key
 *
 * @param client - GraphQL client
 * @param id - API key Id
 * @param options - Options
 */
export async function deleteApiKey(
  client: GraphQLClient,
  id: string,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { logger } = options;
  await makeGraphQLRequest(client, DELETE_API_KEY, { variables: { id }, logger });
}
