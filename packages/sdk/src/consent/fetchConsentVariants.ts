import type { UIConfiguration } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchConsentManagerId } from './fetchConsentManagerId.js';
import { FETCH_CONSENT_UI_VARIANTS } from './gqls/consentManager.js';

const PAGE_SIZE = 50;

/** Status of a consent UI variant */
export type UiVariantStatus = 'DRAFT' | 'ACTIVE' | 'PUBLISHED';

/** User flow for a consent UI variant */
export type ConsentUiUserFlow = 'BANNER' | 'MODAL' | 'BANNER_AND_MODAL';

/** A consent UI variant returned by the consentUiVariants query */
export interface ConsentUiVariant {
  /** The id of the consent UI variant */
  id: string;
  /** The display name for this UI variant */
  name: string;
  /** Description of this UI variant */
  description?: string;
  /** Locales this UI variant applies to */
  locales: string[];
  /** Variant behavior and layer configuration */
  configuration: UIConfiguration;
  /** Status of this UI variant */
  status: UiVariantStatus;
  /** The consent UI theme associated with this UI variant */
  theme?: {
    /** The id of the consent UI theme */
    id: string;
  };
  /** The user flow for this UI variant */
  userFlow?: ConsentUiUserFlow;
}

/** Paginated response from the consentUiVariants GraphQL query */
export interface ConsentUiVariantsQueryResponse {
  /** Consent UI variants for the airgap bundle */
  nodes: ConsentUiVariant[];
  /** Total number of variants matching the filter */
  totalCount: number;
}

/**
 * Fetch consent variants
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns consent UI variants
 */
export async function fetchConsentVariants(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<ConsentUiVariant[]> {
  const variants: ConsentUiVariant[] = [];
  let offset = 0;
  const airgapBundleId = await fetchConsentManagerId(client, { logger: options.logger });

  let shouldContinue = false;
  do {
    const {
      consentUiVariants: { nodes },
    } = await makeGraphQLRequest<{
      consentUiVariants: ConsentUiVariantsQueryResponse;
    }>(client, FETCH_CONSENT_UI_VARIANTS, {
      variables: { airgapBundleId, first: PAGE_SIZE, offset },
      logger: options.logger,
    });
    variants.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return variants;
}
