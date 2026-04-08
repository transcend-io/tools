import { RequestAction, RequestDataSiloStatus, RequestStatus } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { REQUEST_DATA_SILOS } from './gqls/requestDataSilo.js';

export interface RequestDataSilo {
  /** ID of RequestDataSilo */
  id: string;
  /** Request */
  request: {
    /** Type of request */
    type: RequestAction;
  };
}

export interface RequestDataSiloFilters {
  /** ID of request to filter on */
  requestId?: string;
  /** Data silo ID */
  dataSiloId?: string;
  /** The statuses to filter on */
  statuses?: RequestDataSiloStatus[];
  /** The request statuses to filter on */
  requestStatuses?: RequestStatus[];
}

/**
 * Fetch a count of request data silos
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Count of request data silos
 */
export async function fetchRequestDataSilosCount(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Filter options */
    filterBy?: RequestDataSiloFilters;
  },
): Promise<number> {
  const { logger, filterBy: { requestId, dataSiloId, requestStatuses, statuses } = {} } = options;
  const {
    requestDataSilos: { totalCount },
  } = await makeGraphQLRequest<{
    /** Request Data Silos */
    requestDataSilos: {
      /** List */
      nodes: RequestDataSilo[];
      /** Total count */
      totalCount: number;
    };
  }>(client, REQUEST_DATA_SILOS, {
    variables: {
      first: 1,
      offset: 0,
      filterBy: {
        dataSiloId,
        requestId,
        status: statuses,
        requestStatus: requestStatuses,
      },
    },
    logger,
  });

  return totalCount;
}

const PAGE_SIZE = 100;

/**
 * Fetch all request data silos by some filter criteria
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns List of request data silos
 */
export async function fetchRequestDataSilos(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Filter options */
    filterBy?: RequestDataSiloFilters;
    /** Limit on number of requests */
    limit?: number;
    /** Handle progress updates */
    onProgress?: (numUpdated: number) => void;
  },
): Promise<RequestDataSilo[]> {
  const {
    logger,
    filterBy: { requestId, dataSiloId, requestStatuses, statuses } = {},
    limit,
    onProgress,
  } = options;
  const requestDataSilos: RequestDataSilo[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      requestDataSilos: { nodes },
    } = await makeGraphQLRequest<{
      /** Request Data Silos */
      requestDataSilos: {
        /** List */
        nodes: RequestDataSilo[];
        /** Total count */
        totalCount: number;
      };
    }>(client, REQUEST_DATA_SILOS, {
      variables: {
        first: PAGE_SIZE,
        offset,
        filterBy: {
          dataSiloId,
          requestId,
          status: statuses,
          requestStatus: requestStatuses,
        },
      },
      logger,
    });
    requestDataSilos.push(...nodes);

    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
    onProgress?.(nodes.length);
  } while (shouldContinue && (!limit || offset < limit));

  return requestDataSilos;
}

/**
 * Fetch a single request data silo by request and data silo IDs
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns The matching request data silo
 */
export async function fetchRequestDataSilo(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Filter options */
    filterBy: {
      /** ID of request to filter on */
      requestId: string;
      /** Data silo ID */
      dataSiloId: string;
    };
  },
): Promise<RequestDataSilo> {
  const {
    logger,
    filterBy: { requestId, dataSiloId },
  } = options;
  const nodes = await fetchRequestDataSilos(client, {
    logger,
    filterBy: { requestId, dataSiloId },
  });
  if (nodes.length !== 1) {
    throw new Error(
      `Failed to find RequestDataSilo with requestId:${requestId},dataSiloId:${dataSiloId}`,
    );
  }

  return nodes[0]!;
}
