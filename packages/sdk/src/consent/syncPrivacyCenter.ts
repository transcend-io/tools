import type { LocaleValue } from '@transcend-io/internationalization';
import type { PrivacyCenterFooterLayout } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchAllPrivacyCenters } from './fetchAllPrivacyCenters.js';
import { fetchPrivacyCenterId } from './fetchPrivacyCenterId.js';
import { UPDATE_PRIVACY_CENTER } from './gqls/privacyCenter.js';
import { resolveDisplayedChildOrganizationIds } from './resolveDisplayedChildOrganizationIds.js';
import {
  syncPrivacyCenterFooterLinks,
  type PrivacyCenterFooterLinkInput,
} from './syncPrivacyCenterFooterLinks.js';

export interface PrivacyCenterInput {
  /** Whether or not the entire privacy center is enabled or disabled */
  isDisabled?: boolean;
  /** Whether or not to show the privacy requests button */
  showPrivacyRequestButton?: boolean;
  /** Whether or not to show the data practices page */
  showDataPractices?: boolean;
  /** Whether or not to show the policies page */
  showPolicies?: boolean;
  /** Whether or not to show the tracking technologies page */
  showTrackingTechnologies?: boolean;
  /** Whether or not to show the cookies on the tracking technologies page */
  showCookies?: boolean;
  /** Whether or not to show the data flows on the tracking technologies page */
  showDataFlows?: boolean;
  /** Whether or not to show the consent manager opt out options on the tracking technologies page */
  showConsentManager?: boolean;
  /** Whether or not to show the manage your privacy page */
  showManageYourPrivacy?: boolean;
  /** Whether or not to show the marketing preferences page */
  showMarketingPreferences?: boolean;
  /** What languages are supported for the privacy center */
  locales?: LocaleValue[];
  /** The default locale for the privacy center */
  defaultLocale?: LocaleValue;
  /** Whether or not to prefer the browser default locale */
  preferBrowserDefaultLocale?: boolean;
  /** The support email address */
  supportEmail?: string;
  /** The reply-to email address */
  replyToEmail?: string;
  /** Whether or not to send emails from a no reply email */
  useNoReplyEmailAddress?: boolean;
  /** Whether or not to use a custom email domain */
  useCustomEmailDomain?: boolean;
  /** Whether or not to transcend access requests from JSON to CSV */
  transformAccessReportJsonToCsv?: boolean;
  /** Whether custom fields are required on privacy center workflows */
  'workflows-custom-fields-required'?: boolean;
  /**
   * Child organization URIs and/or IDs to display on a unified multi-brand
   * privacy center
   */
  'displayed-child-organization-uris'?: string[];
  /** Footer layout for privacy center footer links */
  'footer-layout'?: PrivacyCenterFooterLayout;
  /** Footer links displayed on the privacy center */
  'footer-links'?: PrivacyCenterFooterLinkInput[];
  /** The theme object of colors to display on the privacy center */
  theme?: {
    /** The theme colors */
    colors?: Record<string, string | undefined>;
    /** Styles to apply to components */
    componentStyles?: Record<string, unknown>;
    /** Override styles */
    textStyles?: Record<string, unknown>;
  };
}

/**
 * Sync the privacy center
 *
 * @param client - GraphQL client
 * @param privacyCenter - The privacy center input
 * @param options - Options
 * @returns Whether the privacy center was synced successfully
 */
export async function syncPrivacyCenter(
  client: GraphQLClient,
  privacyCenter: PrivacyCenterInput,
  options: {
    /** Logger instance */
    logger?: Logger;
    /** When true, skip publishing the privacy center after update */
    skipPublish?: boolean;
  } = {},
): Promise<boolean> {
  const { logger = NOOP_LOGGER, skipPublish } = options;
  let encounteredError = false;
  logger.info('Syncing privacy center...');

  const privacyCenterId = await fetchPrivacyCenterId(client, { logger });

  const displayedChildOrganizationUris = privacyCenter['displayed-child-organization-uris'];
  const footerLinks = privacyCenter['footer-links'];
  const needsExisting = !!displayedChildOrganizationUris || footerLinks !== undefined;
  const [existing] = needsExisting ? await fetchAllPrivacyCenters(client, { logger }) : [];

  let displayedChildOrganizationIds: string[] | undefined;
  if (displayedChildOrganizationUris) {
    displayedChildOrganizationIds = resolveDisplayedChildOrganizationIds(
      existing?.childOrganizations ?? [],
      displayedChildOrganizationUris,
    );
  }

  try {
    await makeGraphQLRequest(client, UPDATE_PRIVACY_CENTER, {
      variables: {
        input: {
          privacyCenterId,
          transformAccessReportJsonToCsv: privacyCenter.transformAccessReportJsonToCsv,
          useCustomEmailDomain: privacyCenter.useCustomEmailDomain,
          useNoReplyEmailAddress: privacyCenter.useNoReplyEmailAddress,
          replyToEmail: privacyCenter.replyToEmail,
          supportEmail: privacyCenter.supportEmail,
          preferBrowserDefaultLocale: privacyCenter.preferBrowserDefaultLocale,
          defaultLocale: privacyCenter.defaultLocale,
          locales: privacyCenter.locales,
          showMarketingPreferences: privacyCenter.showMarketingPreferences,
          showManageYourPrivacy: privacyCenter.showManageYourPrivacy,
          showPolicies: privacyCenter.showPolicies,
          showConsentManager: privacyCenter.showConsentManager,
          showDataFlows: privacyCenter.showDataFlows,
          showCookies: privacyCenter.showCookies,
          showTrackingTechnologies: privacyCenter.showTrackingTechnologies,
          showPrivacyRequestButton: privacyCenter.showPrivacyRequestButton,
          isDisabled: privacyCenter.isDisabled,
          workflowsCustomFieldsRequired: privacyCenter['workflows-custom-fields-required'],
          footerLayout: privacyCenter['footer-layout'],
          ...(displayedChildOrganizationIds ? { displayedChildOrganizationIds } : {}),
          ...(skipPublish !== undefined ? { skipPublish } : {}),
          ...(privacyCenter.theme
            ? {
                colorPalette: privacyCenter.theme.colors,
                componentStyles: privacyCenter.theme.componentStyles,
                textStyles: privacyCenter.theme.textStyles,
              }
            : {}),
        },
      },
      logger,
    });

    if (footerLinks !== undefined) {
      await syncPrivacyCenterFooterLinks(
        client,
        privacyCenterId,
        footerLinks,
        existing?.footerLinks ?? [],
        { logger },
      );
    }

    logger.info('Successfully synced privacy center!');
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to sync privacy center! - ${(err as Error).message}`);
  }

  return !encounteredError;
}
