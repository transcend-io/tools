import type { ThemeConfiguration } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchConsentManagerId } from './fetchConsentManagerId.js';
import { FETCH_CONSENT_UI_THEMES } from './gqls/consentManager.js';

const PAGE_SIZE = 50;

/** A consent UI theme returned by the consentUiThemes query */
export interface ConsentUiTheme {
  /** The id of the consent UI theme */
  id: string;
  /** The display name for this UI theme */
  name: string;
  /** The unique identifier for this UI theme */
  slug: string;
  /** Theme styling configuration */
  configuration: ThemeConfiguration;
}

/** Paginated response from the consentUiThemes GraphQL query */
export interface ConsentUiThemesQueryResponse {
  /** Consent UI themes for the airgap bundle */
  nodes: ConsentUiTheme[];
  /** Total number of themes matching the filter */
  totalCount: number;
}

/**
 * Fetch consent themes
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns consent UI themes
 */
export async function fetchConsentThemes(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<ConsentUiTheme[]> {
  const themes: ConsentUiTheme[] = [];
  let offset = 0;
  const airgapBundleId = await fetchConsentManagerId(client, { logger: options.logger });

  let shouldContinue = false;
  do {
    const {
      consentUiThemes: { nodes },
    } = await makeGraphQLRequest<{
      consentUiThemes: ConsentUiThemesQueryResponse;
    }>(client, FETCH_CONSENT_UI_THEMES, {
      variables: { airgapBundleId, first: PAGE_SIZE, offset },
      logger: options.logger,
    });
    themes.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return themes;
}
