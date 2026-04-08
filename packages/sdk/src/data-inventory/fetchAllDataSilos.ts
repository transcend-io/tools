import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import type { DataSiloAttributeValue } from '../dsr-automation/formatAttributeValues.js';
import { DATA_SILOS } from './gqls/dataSilo.js';

export type { DataSiloAttributeValue };

export interface DataSilo {
  /** ID of dataSilo */
  id: string;
  /** Title of dataSilo */
  title: string;
  /** Type of silo */
  type: string;
  /** The link to the data silo */
  link: string;
  /** Attribute labels */
  attributeValues: DataSiloAttributeValue[];
  /** description */
  description: string;
  /** Metadata for this data silo */
  catalog: {
    /** Whether the data silo supports automated vendor coordination */
    hasAvcFunctionality: boolean;
  };
}

/**
 * Fetch all dataSilos in the organization
 *
 * @param client - GraphQL client
 * @param options - Filter and pagination options
 * @returns All dataSilos in the organization
 */
export async function fetchAllDataSilos<TDataSilo extends DataSilo>(
  client: GraphQLClient,
  options: {
    /** Page size to fetch data silos in */
    pageSize: number;
    /** Filter by title */
    titles?: string[];
    /** Filter by IDs */
    ids?: string[];
    /** Set of integration names to fetch */
    integrationNames?: string[];
    /** GQL query override for data silos */
    gql?: string;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<TDataSilo[]> {
  const {
    titles,
    pageSize,
    ids = [],
    gql = DATA_SILOS,
    integrationNames = [],
    logger = NOOP_LOGGER,
  } = options;

  logger.info(`Fetching ${ids.length === 0 ? 'all' : ids.length} Data Silos...`);

  const dataSilos: TDataSilo[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      dataSilos: { nodes },
    } = await makeGraphQLRequest<{
      /** Query response */
      dataSilos: {
        /** List of matches */
        nodes: TDataSilo[];
      };
    }>(client, gql, {
      variables: {
        filterBy: {
          ids: ids.length > 0 ? ids : undefined,
          type: integrationNames.length > 0 ? integrationNames : undefined,
          titles,
        },
        first: pageSize,
        offset,
      },
      logger,
    });
    dataSilos.push(...nodes);
    offset += pageSize;
    shouldContinue = nodes.length === pageSize;
  } while (shouldContinue);

  logger.info(
    `Found a total of ${dataSilos.length} data silo${
      ids.length > 0 ? ` matching IDs ${ids.join(',')}` : ''
    }s${
      integrationNames.length > 0 ? ` matching integrationNames ${integrationNames.join(',')}` : ''
    }`,
  );

  return dataSilos.sort((a, b) => a.title.localeCompare(b.title));
}
