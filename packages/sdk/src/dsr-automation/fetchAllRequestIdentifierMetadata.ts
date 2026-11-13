import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { REQUEST_IDENTIFIERS } from './gqls/requestIdentifier.js';

export interface RequestIdentifierMetadata {
  /** ID of request identifier */
  id: string;
  /** Name of identifier */
  name: string;
  /** Status of identifier */
  isVerifiedAtLeastOnce: boolean;
}

const PAGE_SIZE = 2000;

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
    /** Logger instance */
    logger?: Logger;
    /** Filter options */
    filterBy?: {
      /** ID of request to filter on */
      requestId?: string;
      /** IDs of requests to filter on */
      requestIds?: string[];
      /** Filter for request identifiers updated before this date */
      updatedAtBefore?: Date;
      /** Filter for request identifiers updated after this date */
      updatedAtAfter?: Date;
    };
  } = {},
): Promise<RequestIdentifierMetadata[]> {
  const { logger = NOOP_LOGGER, filterBy } = options;
  const { requestId, requestIds, updatedAtBefore, updatedAtAfter } = filterBy ?? {};
  const resolvedRequestIds = requestIds ?? (requestId ? [requestId] : undefined);
  const requestIdentifiers: RequestIdentifierMetadata[] = [];
  let cursor: string | undefined;

  let shouldContinue = false;
  do {
    const {
      requestIdentifiers: { nodes, pageInfo },
    } = await makeGraphQLRequest<{
      /** Request Identifiers */
      requestIdentifiers: {
        /** List */
        nodes: RequestIdentifierMetadata[];
        /** Pagination info */
        pageInfo: {
          /** Cursor for the last item */
          endCursor: string | null;
          /** Whether more pages exist */
          hasNextPage: boolean;
        };
      };
    }>(client, REQUEST_IDENTIFIERS, {
      variables: {
        first: PAGE_SIZE,
        after: cursor,
        requestIds: resolvedRequestIds,
        updatedAtBefore: updatedAtBefore ? updatedAtBefore.toISOString() : undefined,
        updatedAtAfter: updatedAtAfter ? updatedAtAfter.toISOString() : undefined,
      },
      logger,
    });
    requestIdentifiers.push(...nodes);
    cursor = pageInfo.endCursor ?? undefined;
    shouldContinue = pageInfo.hasNextPage;
  } while (shouldContinue);

  return requestIdentifiers;
}
