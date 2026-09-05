// import { keyBy } from 'lodash-es';
import {
  fetchConsentManagerId,
  makeGraphQLRequest,
  UPDATE_OR_CREATE_COOKIES,
} from '@transcend-io/sdk';
import { mapSeries, type Logger } from '@transcend-io/utils';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { chunk } from 'lodash-es';

import { CookieInput } from '../../codecs.js';
import { logger } from '../../logger.js';

const MAX_PAGE_SIZE = 100;

/** Runtime dependencies for synchronizing cookies. */
export interface SyncCookiesDependencies {
  /** Logger used for progress and GraphQL request diagnostics. */
  readonly logger: Logger;
}

const defaultDependencies: SyncCookiesDependencies = {
  logger,
};

/**
 * Update or create cookies that already existed
 *
 * @param client - GraphQL client
 * @param cookieInputs - List of cookie input
 * @param dependencies - Runtime dependencies
 */
export async function updateOrCreateCookies(
  client: GraphQLClient,
  cookieInputs: CookieInput[],
  dependencies: SyncCookiesDependencies = defaultDependencies,
): Promise<void> {
  const { logger: activeLogger } = dependencies;
  const airgapBundleId = await fetchConsentManagerId(client, { logger: activeLogger });

  // TODO: https://transcend.height.app/T-19841 - add with custom purposes
  // const purposes = await fetchAllPurposes(client);
  // const purposeNameToId = keyBy(purposes, 'name');

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
          // TODO: https://transcend.height.app/T-19841 - add with custom purposes
          // purposeIds: cookie.trackingPurposes
          //   ? cookie.trackingPurposes
          //       .filter((purpose) => purpose !== 'Unknown')
          //       .map((purpose) => purposeNameToId[purpose].id)
          // : undefined,
          description: cookie.description,
          service: cookie.service,
          status: cookie.status,
          attributes: cookie.attributes,
          isRegex: cookie.isRegex,
          // TODO: https://transcend.height.app/T-23718
          // owners,
          // teams,
        })),
      },
      logger: activeLogger,
    });
  });
}

/**
 * Sync the set of cookies from the YML interface into the product
 *
 * @param client - GraphQL client
 * @param cookies - Cookies to sync
 * @param dependencies - Runtime dependencies
 * @returns True upon success, false upon failure
 */
export async function syncCookies(
  client: GraphQLClient,
  cookies: CookieInput[],
  dependencies: SyncCookiesDependencies = defaultDependencies,
): Promise<boolean> {
  const { logger: activeLogger } = dependencies;
  let encounteredError = false;
  activeLogger.info(colors.magenta(`Syncing "${cookies.length}" cookies...`));

  // Ensure no duplicates are being uploaded
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
    activeLogger.info(colors.magenta(`Upserting "${cookies.length}" new cookies...`));
    await updateOrCreateCookies(client, cookies, dependencies);
    activeLogger.info(colors.green(`Successfully synced ${cookies.length} cookies!`));
  } catch (err) {
    encounteredError = true;
    activeLogger.error(colors.red(`Failed to create cookies! - ${err.message}`));
  }

  return !encounteredError;
}
