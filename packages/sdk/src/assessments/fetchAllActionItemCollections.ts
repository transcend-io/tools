import { TranscendProduct } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { GLOBAL_ACTION_ITEM_COLLECTIONS } from './gqls/actionItemCollection.js';

export interface ActionItemCollection {
  /** ID of collection */
  id: string;
  /** Title of collection */
  title: string;
  /** Description of collection */
  description: string;
  /** Whether section is hidden */
  hidden: boolean;
  /** Which locations/products the action item shows up in */
  productLine: TranscendProduct;
}

/**
 * Fetch all action item collections in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All action item collections in the organization
 */
export async function fetchAllActionItemCollections(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger: Logger;
    /** Filter by */
    filterBy?: {
      /** Filter on location */
      location?: TranscendProduct;
    };
  },
): Promise<ActionItemCollection[]> {
  const { logger, filterBy = {} } = options;
  const {
    globalActionItemCollections: { nodes },
  } = await makeGraphQLRequest<{
    /** ActionItemCollections */
    globalActionItemCollections: {
      /** List */
      nodes: ActionItemCollection[];
    };
  }>(client, GLOBAL_ACTION_ITEM_COLLECTIONS, {
    variables: {
      filterBy: {
        ...filterBy,
      },
    },
    logger,
  });
  return nodes;
}
