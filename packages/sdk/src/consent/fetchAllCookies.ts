import { ConsentTrackerStatus, OrderDirection } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchConsentManagerId } from './fetchConsentManagerId.js';
import {
  COOKIES,
  type TranscendCookieGql,
  type TranscendCliCookiesResponse,
} from './gqls/cookies.js';

/** Sort order for cookie queries */
export interface CookieOrder {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: OrderDirection;
}

const PAGE_SIZE = 20;

const DEFAULT_COOKIE_ORDER: CookieOrder[] = [
  { field: 'createdAt', direction: OrderDirection.Asc },
  { field: 'name', direction: OrderDirection.Asc },
];

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
    logger?: Logger;
    /** Filter options */
    filterBy?: {
      /** The status to fetch */
      status?: ConsentTrackerStatus;
    };
    /** Sort ordering (defaults to createdAt ASC, name ASC) */
    orderBy?: CookieOrder[];
  } = {},
): Promise<TranscendCookieGql[]> {
  const {
    logger,
    filterBy: { status = ConsentTrackerStatus.Live } = {},
    orderBy = DEFAULT_COOKIE_ORDER,
  } = options;
  const cookies: TranscendCookieGql[] = [];
  let offset = 0;

  const airgapBundleId = await fetchConsentManagerId(client, { logger });

  let shouldContinue = false;
  do {
    const {
      cookies: { nodes },
    } = await makeGraphQLRequest<TranscendCliCookiesResponse>(client, COOKIES, {
      variables: {
        input: { airgapBundleId },
        first: PAGE_SIZE,
        offset,
        filterBy: { status },
        orderBy,
      },
      logger,
    });
    cookies.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return cookies.sort((a, b) => a.name.localeCompare(b.name));
}
