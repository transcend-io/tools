import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { REDUCED_REQUESTS_FOR_DATA_SILO_COUNT } from './gqls/request.js';

/**
 * Get number of open requests for a data silo
 *
 * @param client - GraphQL client
 * @param filterOptions - Filter options
 * @param options - Options
 * @returns List of request identifiers
 */
export async function fetchRequestDataSiloActiveCount(
  client: GraphQLClient,
  filterOptions: {
    /** Data silo ID */
    dataSiloId: string;
  },
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<number> {
  const {
    listReducedRequestsForDataSilo: { totalCount },
  } = await makeGraphQLRequest<{
    /** Requests */
    listReducedRequestsForDataSilo: {
      /** Total count */
      totalCount: number;
    };
  }>(client, REDUCED_REQUESTS_FOR_DATA_SILO_COUNT, {
    variables: {
      input: {
        dataSiloId: filterOptions.dataSiloId,
        isResolved: false,
      },
    },
    logger: options.logger,
  });

  return totalCount;
}
