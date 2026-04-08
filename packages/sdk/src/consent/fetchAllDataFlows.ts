import {
  DataFlowScope,
  ConsentTrackerSource,
  ConsentTrackerStatus,
} from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchConsentManagerId } from './fetchConsentManagerId.js';
import { DATA_FLOWS } from './gqls/consentManager.js';

export interface DataFlow {
  /** ID of data flow */
  id: string;
  /** Value of data flow */
  value: string;
  /** Type of data flow */
  type: DataFlowScope;
  /** Description of data flow */
  description: string;
  /** Enabled tracking purposes */
  trackingType: string[];
  /** The consent service */
  service: {
    /** Integration name of service */
    integrationName: string;
  };
  /** Source of how tracker was added */
  source: ConsentTrackerSource;
  /** Status of data flow labeling */
  status: ConsentTrackerStatus;
  /** Owners of that data flow */
  owners: {
    /** Email address of owner */
    email: string;
  }[];
  /** Teams assigned to that data flow */
  teams: {
    /** Name of team */
    name: string;
  }[];
  /** Attributes assigned to that data flow */
  attributeValues: {
    /** Name of attribute value */
    name: string;
    /** Attribute key that the value represents */
    attributeKey: {
      /** Name of attribute key */
      name: string;
    };
  }[];
}

const PAGE_SIZE = 20;

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
    logger: Logger;
    /** Filter options */
    filterBy?: {
      /** The status to fetch */
      status?: ConsentTrackerStatus;
    };
  },
): Promise<DataFlow[]> {
  const { logger, filterBy: { status = ConsentTrackerStatus.Live } = {} } = options;
  const dataFlows: DataFlow[] = [];
  let offset = 0;

  const airgapBundleId = await fetchConsentManagerId(client, { logger });

  let shouldContinue = false;
  do {
    const {
      dataFlows: { nodes },
    } = await makeGraphQLRequest<{
      /** Query response */
      dataFlows: {
        /** List of matches */
        nodes: DataFlow[];
      };
    }>(client, DATA_FLOWS, {
      variables: {
        first: PAGE_SIZE,
        offset,
        airgapBundleId,
        status,
        ...(status === ConsentTrackerStatus.NeedsReview ? { showZeroActivity: true } : {}),
      },
      logger,
    });
    dataFlows.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return dataFlows.sort((a, b) => a.value.localeCompare(b.value));
}
