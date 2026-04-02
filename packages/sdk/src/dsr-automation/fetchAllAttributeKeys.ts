import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { ATTRIBUTE_KEYS_REQUESTS } from '../administration/gqls/attributeKey.js';
import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';

export interface AttributeKey {
  /** ID of attribute key */
  id: string;
  /** Name of attribute key */
  name: string;
  /** Attribute key type */
  type: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all attribute keys enabled for privacy requests
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All attribute keys in the organization
 */
export async function fetchAllRequestAttributeKeys(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<AttributeKey[]> {
  const { logger } = options;
  const attributeKeys: AttributeKey[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      attributeKeys: { nodes },
    } = await makeGraphQLRequest<{
      /** Query response */
      attributeKeys: {
        /** List of matches */
        nodes: AttributeKey[];
      };
    }>(client, ATTRIBUTE_KEYS_REQUESTS, {
      variables: { first: PAGE_SIZE, offset },
      logger,
    });
    attributeKeys.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return attributeKeys.sort((a, b) => a.name.localeCompare(b.name));
}
