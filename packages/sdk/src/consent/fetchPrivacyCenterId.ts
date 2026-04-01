import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import {
  DEPLOYED_PRIVACY_CENTER_URL,
  FETCH_PRIVACY_CENTER_ID,
} from './gqls/privacyCenter.js';

/**
 * Fetch default privacy center URL
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Privacy Center ID in organization
 */
export async function fetchPrivacyCenterUrl(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<string> {
  const { logger } = options;
  const { organization } = await makeGraphQLRequest<{
    /** Organization */
    organization: {
      /** URL */
      deployedPrivacyCenterUrl: string;
    };
  }>(client, DEPLOYED_PRIVACY_CENTER_URL, { logger });
  return organization.deployedPrivacyCenterUrl;
}

/**
 * Fetch privacy center ID
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Privacy Center ID in organization
 */
export async function fetchPrivacyCenterId(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger: Logger;
    /** URL to lookup */
    url?: string;
  },
): Promise<string> {
  const { logger, url } = options;
  let urlToUse = url;
  if (!urlToUse) {
    urlToUse = await fetchPrivacyCenterUrl(client, { logger });
  }
  const { privacyCenter } = await makeGraphQLRequest<{
    /** Privacy Center query */
    privacyCenter: {
      /** ID of bundle */
      id: string;
    };
  }>(client, FETCH_PRIVACY_CENTER_ID, {
    variables: { url: urlToUse },
    logger,
  });
  return privacyCenter.id;
}
