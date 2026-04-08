import { RequestEnricherStatus } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { REQUEST_ENRICHERS } from './gqls/requestEnricher.js';

export interface RequestEnricher {
  /** ID of request enricher */
  id: string;
  /** Name of identifier */
  enricher: {
    /** ID of enricher */
    id: string;
    /** Title of enricher */
    title: string;
    /** Typeof of enricher */
    type: string;
  };
  /** The status of the enricher */
  status: RequestEnricherStatus;
}

const PAGE_SIZE = 50;

/**
 * Fetch all request enrichers for a particular request
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns List of request enrichers
 */
export async function fetchAllRequestEnrichers(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Filter options */
    filterBy: {
      /** ID of request to filter on */
      requestId: string;
    };
  },
): Promise<RequestEnricher[]> {
  const {
    logger = NOOP_LOGGER,
    filterBy: { requestId },
  } = options;
  const requestEnrichers: RequestEnricher[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      requestEnrichers: { nodes },
    } = await makeGraphQLRequest<{
      /** Request Enrichers */
      requestEnrichers: {
        /** List */
        nodes: RequestEnricher[];
      };
    }>(client, REQUEST_ENRICHERS, {
      variables: { first: PAGE_SIZE, offset, requestId },
      logger,
    });
    requestEnrichers.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return requestEnrichers;
}
