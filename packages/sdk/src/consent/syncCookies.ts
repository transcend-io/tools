import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { chunk } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchConsentManagerId } from './fetchConsentManagerId.js';
import { UPDATE_OR_CREATE_COOKIES } from './gqls/consentManager.js';

export interface CookieInput {
  /** Name of cookie */
  name: string;
  /** Whether or not the cookie is a regular expression */
  isRegex?: boolean;
  /** Description of cookie */
  description?: string;
  /** The tracking purposes that are required to be opted in for this cookie */
  trackingPurposes?: string[];
  /** Name of the consent service attached */
  service?: string;
  /** Status of the tracker (approved vs triage) */
  status?: ConsentTrackerStatus;
  /** Email addresses of owners */
  owners?: string[];
  /** Names of teams responsible for managing this cookie */
  teams?: string[];
  /** Attribute key-value pairs */
  attributes?: {
    /** Attribute key */
    key: string;
    /** Attribute values */
    values: string[];
  }[];
}

const MAX_PAGE_SIZE = 100;

/**
 * Update or create cookies
 *
 * @param client - GraphQL client
 * @param cookieInputs - List of cookie inputs
 * @param options - Options
 */
export async function updateOrCreateCookies(
  client: GraphQLClient,
  cookieInputs: CookieInput[],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { logger } = options;
  const airgapBundleId = await fetchConsentManagerId(client, { logger });

  await mapSeries(chunk(cookieInputs, MAX_PAGE_SIZE), async (page) => {
    await makeGraphQLRequest(client, UPDATE_OR_CREATE_COOKIES, {
      variables: {
        airgapBundleId,
        cookies: page.map((cookie) => ({
          name: cookie.name,
          trackingPurposes:
            cookie.trackingPurposes && cookie.trackingPurposes.length > 0
              ? cookie.trackingPurposes
              : undefined,
          description: cookie.description,
          service: cookie.service,
          status: cookie.status,
          attributes: cookie.attributes,
          isRegex: cookie.isRegex,
        })),
      },
      logger,
    });
  });
}

/**
 * Sync the set of cookies into the product
 *
 * @param client - GraphQL client
 * @param cookies - Cookies to sync
 * @param options - Options
 * @returns True upon success, false upon failure
 */
export async function syncCookies(
  client: GraphQLClient,
  cookies: CookieInput[],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<boolean> {
  const { logger } = options;
  let encounteredError = false;
  logger.info(`Syncing "${cookies.length}" cookies...`);

  const notUnique = cookies.filter(
    (cookie) =>
      cookies.filter((cook) => cookie.name === cook.name && cookie.isRegex === cook.isRegex)
        .length > 1,
  );
  if (notUnique.length > 0) {
    throw new Error(
      `Failed to upload cookies as there were non-unique entries found: ${notUnique
        .map(({ name }) => name)
        .join(',')}`,
    );
  }

  try {
    logger.info(`Upserting "${cookies.length}" new cookies...`);
    await updateOrCreateCookies(client, cookies, { logger });
    logger.info(`Successfully synced ${cookies.length} cookies!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to create cookies! - ${(err as Error).message}`);
  }

  return !encounteredError;
}
