import { DataCategoryType } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { DATA_SUB_CATEGORIES } from './gqls/dataCategory.js';

export interface DataSubCategory {
  /** ID of data category */
  id: string;
  /** Name of data category */
  name: string;
  /** Type of data category */
  category: DataCategoryType;
  /** Description of data category */
  description?: string;
  /** Regex for data category */
  regex?: string;
  /** Assigned teams */
  teams: {
    /** Team name */
    name: string;
  }[];
  /** Assigned owners */
  owners: {
    /** Email */
    email: string;
  }[];
  /** Custom fields */
  attributeValues: {
    /** Name of attribute value */
    name: string;
    /** Attribute key that the value represents */
    attributeKey: {
      /** Name of attribute team */
      name: string;
    };
  }[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all dataSubCategories in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All dataSubCategories in the organization
 */
export async function fetchAllDataCategories(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<DataSubCategory[]> {
  const { logger } = options;
  const dataSubCategories: DataSubCategory[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      dataSubCategories: { nodes },
    } = await makeGraphQLRequest<{
      /** DataCategories */
      dataSubCategories: {
        /** List */
        nodes: DataSubCategory[];
      };
    }>(client, DATA_SUB_CATEGORIES, {
      variables: { first: PAGE_SIZE, offset },
      logger,
    });
    dataSubCategories.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return dataSubCategories.sort((a, b) => a.name.localeCompare(b.name));
}
