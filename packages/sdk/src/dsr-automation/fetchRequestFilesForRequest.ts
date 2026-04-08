import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { BULK_REQUEST_FILES } from './gqls/requestFile.js';

export interface RequestFileCursor {
  /** The ID of the request file */
  id: string;
  /** The created at timestamp */
  createdAt: string;
}

export interface RequestFile {
  /** The remote ID */
  remoteId: string;
  /** The file name */
  fileName: string;
}

export interface RequestFileResponse {
  /** RequestFiles */
  bulkRequestFiles: {
    /** List */
    nodes: RequestFile[];
    /** The page info */
    pageInfo: {
      /** Whether there is a next page */
      hasNextPage: boolean;
      /** The end cursor */
      endCursor: string;
    };
  };
}

/**
 * Fetch all RequestFiles for a single request
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All RequestFiles in the organization
 */
export async function fetchRequestFilesForRequest(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger: Logger;
    /** How many request files to fetch per API call */
    pageSize?: number;
    /** Filter options */
    filterBy: {
      /** Filter by request IDs */
      requestIds: string[];
      /** Filter by data silo ID */
      dataSiloIds: string[];
    };
  },
): Promise<RequestFile[]> {
  const { logger, pageSize = 100, filterBy } = options;
  const requestFiles: RequestFile[] = [];
  let cursor: string | null = null;

  let shouldContinue = false;
  do {
    const response: RequestFileResponse = await makeGraphQLRequest<RequestFileResponse>(
      client,
      BULK_REQUEST_FILES,
      {
        variables: {
          filterBy: {
            ...filterBy,
          },
          first: pageSize,
          after: cursor ?? undefined,
        },
        logger,
      },
    );
    const {
      bulkRequestFiles: { nodes, pageInfo },
    } = response;
    requestFiles.push(...nodes);
    shouldContinue = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  } while (shouldContinue);

  return requestFiles.sort((a, b) => a.remoteId.localeCompare(b.remoteId));
}
