import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { REQUEST_IDENTIFIERS } from './gqls/requestIdentifier.js';

export interface RequestIdentifierMetadata {
  /** ID of request identifier */
  id: string;
  /** Name of identifier */
  name: string;
  /** Status of identifier */
  isVerifiedAtLeastOnce: boolean;
}

const PAGE_SIZE = 50;

/**
 * Fetch all request identifier metadata for a particular request
 *
 * @param client - GraphQL client
 * @param options - Filter options
 * @returns List of request identifiers
 */
export async function fetchAllRequestIdentifierMetadata(
  client: GraphQLClient,
  options: {
    /** ID of request to filter on */
    requestId?: string;
    /** IDs of requests to filter on */
    requestIds?: string[];
    /** Filter for request identifiers updated before this date */
    updatedAtBefore?: Date;
    /** Filter for request identifiers updated after this date */
    updatedAtAfter?: Date;
    /** Logger instance */
    logger: Logger;
  },
): Promise<RequestIdentifierMetadata[]> {
  const { requestId, requestIds, updatedAtBefore, updatedAtAfter, logger } = options;
  const resolvedRequestIds = requestIds ?? (requestId ? [requestId] : undefined);
  const requestIdentifiers: RequestIdentifierMetadata[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      requestIdentifiers: { nodes },
    } = await makeGraphQLRequest<{
      /** Request Identifiers */
      requestIdentifiers: {
        /** List */
        nodes: RequestIdentifierMetadata[];
      };
    }>(client, REQUEST_IDENTIFIERS, {
      variables: {
        first: PAGE_SIZE,
        offset,
        requestIds: resolvedRequestIds,
        updatedAtBefore: updatedAtBefore ? updatedAtBefore.toISOString() : undefined,
        updatedAtAfter: updatedAtAfter ? updatedAtAfter.toISOString() : undefined,
      },
      logger,
    });
    requestIdentifiers.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return requestIdentifiers;
}
