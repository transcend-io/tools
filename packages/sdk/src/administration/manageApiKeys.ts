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
 * @param options - Options
 * @returns The API key
 */
export async function createApiKey(
  client: GraphQLClient,
  options: {
    /** Input for creating an API key */
    input: {
      /** Title of API key */
      title: string;
      /** Scopes for API key */
      scopes: ScopeName[];
    };
    /** Logger instance */
    logger?: Logger;
  },
): Promise<CreatedApiKey> {
  const {
    input: { title, scopes },
    logger,
  } = options;
  const {
    createApiKey: { apiKey },
  } = await makeGraphQLRequest<{
    /** Create API key */
    createApiKey: {
      /** API key */
      apiKey: CreatedApiKey;
    };
  }>(client, CREATE_API_KEY, { variables: { input: { title, scopes } }, logger });

  return apiKey;
}

/**
 * Delete an API key
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function deleteApiKey(
  client: GraphQLClient,
  options: {
    /** API key ID to delete */
    id: string;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<void> {
  const { id, logger } = options;
  await makeGraphQLRequest(client, DELETE_API_KEY, { variables: { id }, logger });
}
