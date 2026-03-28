import { makeEnum } from '@transcend-io/type-utils';

/** The purpose of processing data */
export const ProcessingPurpose = makeEnum({
  /** Provide a service that the user explicitly requests and that is part of the product's basic service or functionality */
  Essential: 'ESSENTIAL',
  /** Provide a service that the user explicitly requests but that is not a necessary part of the product's basic service */
  AdditionalFunctionality: 'ADDITIONAL_FUNCTIONALITY',
  /** To show ads that are either targeted to the specific user or not targeted */
  Advertising: 'ADVERTISING',
  /** To contact the user to offer products, services, or other promotions */
  Marketing: 'MARKETING',
  /** For understanding the product’s audience, improving the product, inform company strategy, or general research */
  Analytics: 'ANALYTICS',
  /** For providing user with a personalized experience */
  Personalization: 'PERSONALIZATION',
  /** For product operation and security, enforcement of terms of service, fraud prevention, protecting users and property, etc. */
  OperationSecurity: 'OPERATION_SECURITY',
  /** For compliance with legal obligations */
  Legal: 'LEGAL',
  /** For data that was transferred as part of a change in circumstance (e.g. a merger or acquisition) */
  Transfer: 'TRANSFER',
  /** For selling the data to third parties */
  Sale: 'SALE',
  /** For personnel training, recruitment, payroll, management, etc. */
  HR: 'HR',
  /** Other specific purpose not covered above */
  Other: 'OTHER',
  /** The purpose is not explicitly stated or is unclear */
  Unspecified: 'UNSPECIFIED',
});

/** Type override */
export type ProcessingPurpose = (typeof ProcessingPurpose)[keyof typeof ProcessingPurpose];

/** The category of personal data that is processed */
export const DataCategoryType = makeEnum({
  /** Financial information */
  Financial: 'FINANCIAL',
  /** Health information */
  Health: 'HEALTH',
  /** Contact information */
  Contact: 'CONTACT',
  /** Geo-location information */
  Location: 'LOCATION',
  /** Demographic Information */
  Demographic: 'DEMOGRAPHIC',
  /** Identifiers that uniquely identify a person */
  Id: 'ID',
  /** The user's online activities on the first party website/app or other websites/apps */
  OnlineActivity: 'ONLINE_ACTIVITY',
  /** The user’s profile on the first-party website/app and its contents */
  UserProfile: 'USER_PROFILE',
  /** User profile and data from a social media website/app or other third party service */
  SocialMedia: 'SOCIAL_MEDIA',
  /** Connection information for the current browsing session, e.g. device IDs, MAC addresses, IP addresses, etc. */
  Connection: 'CONNECTION',
  /** Cookies and tracking elements */
  Tracking: 'TRACKING',
  /** Computer or device information */
  Device: 'DEVICE',
  /** Any data that is collected through surveys */
  Survey: 'SURVEY',
  /** A specific type of information not covered by the above categories */
  Other: 'OTHER',
  /** The type of information is not explicitly stated or unclear */
  Unspecified: 'UNSPECIFIED',
  /** Information that is NOT personal data */
  NotPersonalData: 'NOT_PERSONAL_DATA',
  /**
   * Information identifying an object associated with a particular integration.
   * For example, Salesforce Object Ids.
   */
  IntegrationIdentifier: 'INTEGRATION_IDENTIFIER',
});

/** Type override */
export type DataCategoryType = (typeof DataCategoryType)[keyof typeof DataCategoryType];
