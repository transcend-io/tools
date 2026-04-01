import type { LocaleValue } from '@transcend-io/internationalization';
import type {
  ConfigurableColorPaletteColor,
  PrivacyCenterComponentStyles,
  PrivacyCenterTextStyles,
} from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchPrivacyCenterId } from './fetchPrivacyCenterId.js';
import { UPDATE_PRIVACY_CENTER } from './gqls/privacyCenter.js';

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
  /** The email addresses of the employees within your company that are the go-to individuals for managing this privacy center */
  supportEmail?: string;
  /** The email addresses of the employees within your company that are the go-to individuals for managing this privacy center */
  replyToEmail?: string;
  /** Whether or not to send emails from a no reply email */
  useNoReplyEmailAddress?: boolean;
  /** Whether or not to use a custom email domain */
  useCustomEmailDomain?: boolean;
  /** Whether or not to transcend access requests from JSON to CSV */
  transformAccessReportJsonToCsv?: boolean;
  /** The theme object of colors to display on the privacy center */
  theme?: {
    /** The theme colors */
    colors?: Partial<Record<ConfigurableColorPaletteColor, string>>;
    /** Component style overrides */
    componentStyles?: Partial<Record<PrivacyCenterComponentStyles, string>>;
    /** Text style overrides */
    textStyles?: Partial<Record<PrivacyCenterTextStyles, string>>;
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
    logger: Logger;
  },
): Promise<boolean> {
  const { logger } = options;
  let encounteredError = false;
  logger.info('Syncing privacy center...');

  // Grab the privacy center ID
  const privacyCenterId = await fetchPrivacyCenterId(client, { logger });

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
    logger.info('Successfully synced privacy center!');
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to create privacy center! - ${(err as Error).message}`);
  }

  return !encounteredError;
}
