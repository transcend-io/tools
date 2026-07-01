import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import {
  FETCH_CONSENT_MANAGER_THEME,
  type TranscendConsentManagerThemeGql,
  type TranscendCliFetchConsentManagerThemeResponse,
} from './gqls/consentManager.js';

/**
 * Fetch consent manager theme
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Consent manager theme
 */
export async function fetchConsentManagerTheme(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Filter options */
    filterBy: {
      /** Airgap bundle ID to fetch for */
      airgapBundleId: string;
    };
  },
): Promise<TranscendConsentManagerThemeGql> {
  const {
    consentManagerTheme: { theme },
  } = await makeGraphQLRequest<TranscendCliFetchConsentManagerThemeResponse>(
    client,
    FETCH_CONSENT_MANAGER_THEME,
    {
      variables: { airgapBundleId: options.filterBy.airgapBundleId },
      logger: options.logger,
    },
  );
  return theme;
}
