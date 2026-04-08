import { ConsentTrackerSource, ConsentTrackerStatus } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchConsentManagerId } from './fetchConsentManagerId.js';
import { COOKIES } from './gqls/consentManager.js';

export interface Cookie {
  /** ID of the cookie */
  id: string;
  /** Name of the cookie */
  name: string;
  /** Whether cookie is a regular expression */
  isRegex: boolean;
  /** Description of cookie */
  description: string;
  /** Enabled tracking purposes for the cookie */
  trackingPurposes: string[];
  /** The consent service */
  service: {
    /** Integration name of service */
    integrationName: string;
  };
  /** Source of how tracker was added */
  source: ConsentTrackerSource;
  /** Status of cookie labeling */
  status: ConsentTrackerStatus;
  /** Owners of that cookie */
  owners: {
    /** Email address of owner */
    email: string;
  }[];
  /** Teams assigned to that cookie */
  teams: {
    /** Name of team */
    name: string;
  }[];
  /** Attributes assigned to that cookie */
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
 * Fetch all Cookies in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All Cookies in the organization
 */
export async function fetchAllCookies(
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
): Promise<Cookie[]> {
  const { logger, filterBy: { status = ConsentTrackerStatus.Live } = {} } = options;
  const cookies: Cookie[] = [];
  let offset = 0;

  const airgapBundleId = await fetchConsentManagerId(client, { logger });

  let shouldContinue = false;
  do {
    const {
      cookies: { nodes },
    } = await makeGraphQLRequest<{
      /** Query response */
      cookies: {
        /** List of matches */
        nodes: Cookie[];
      };
    }>(client, COOKIES, {
      variables: { first: PAGE_SIZE, offset, airgapBundleId, status },
      logger,
    });
    cookies.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return cookies.sort((a, b) => a.name.localeCompare(b.name));
}
