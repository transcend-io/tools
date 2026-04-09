import { ConsentTrackerStatus, OrderDirection } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchConsentManagerId } from './fetchConsentManagerId.js';
import {
  DATA_FLOWS,
  type TranscendDataFlowGql,
  type TranscendCliDataFlowsResponse,
} from './gqls/dataFlows.js';

/** Sort order for data flow queries */
export interface DataFlowOrder {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: OrderDirection;
}

const PAGE_SIZE = 20;

const DEFAULT_DATA_FLOW_ORDER: DataFlowOrder[] = [
  { field: 'createdAt', direction: OrderDirection.Asc },
  { field: 'value', direction: OrderDirection.Asc },
];

/**
 * Fetch all DataFlows in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All DataFlows in the organization
 */
export async function fetchAllDataFlows(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Filter options */
    filterBy?: {
      /** The status to fetch */
      status?: ConsentTrackerStatus;
    };
    /** Sort ordering (defaults to createdAt ASC, value ASC) */
    orderBy?: DataFlowOrder[];
  } = {},
): Promise<TranscendDataFlowGql[]> {
  const {
    logger,
    filterBy: { status = ConsentTrackerStatus.Live } = {},
    orderBy = DEFAULT_DATA_FLOW_ORDER,
  } = options;
  const dataFlows: TranscendDataFlowGql[] = [];
  let offset = 0;

  const airgapBundleId = await fetchConsentManagerId(client, { logger });

  let shouldContinue = false;
  do {
    const {
      dataFlows: { nodes },
    } = await makeGraphQLRequest<TranscendCliDataFlowsResponse>(client, DATA_FLOWS, {
      variables: {
        input: { airgapBundleId },
        first: PAGE_SIZE,
        offset,
        filterBy: {
          status,
          ...(status === ConsentTrackerStatus.NeedsReview ? { showZeroActivity: true } : {}),
        },
        orderBy,
      },
      logger,
    });
    dataFlows.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return dataFlows.sort((a, b) => a.value.localeCompare(b.value));
}
