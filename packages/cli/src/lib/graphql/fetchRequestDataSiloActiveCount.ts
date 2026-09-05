import { makeGraphQLRequest, REDUCED_REQUESTS_FOR_DATA_SILO_COUNT } from '@transcend-io/sdk';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { logger } from '../../logger.js';

/** Runtime dependencies for fetching the active request count. */
export interface FetchRequestDataSiloActiveCountDependencies {
  /** Logger used for GraphQL request diagnostics. */
  readonly logger: Logger;
}

const defaultDependencies: FetchRequestDataSiloActiveCountDependencies = {
  logger,
};

/**
 * Get number of open requests for a data silo
 *
 * @param client - GraphQL client
 * @param options - Filter options
 * @param dependencies - Runtime dependencies
 * @returns List of request identifiers
 */
export async function fetchRequestDataSiloActiveCount(
  client: GraphQLClient,
  {
    dataSiloId,
  }: {
    /** Data silo ID */
    dataSiloId: string;
  },
  dependencies: FetchRequestDataSiloActiveCountDependencies = defaultDependencies,
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
        dataSiloId,
        isResolved: false,
      },
    },
    logger: dependencies.logger,
  });

  return totalCount;
}
