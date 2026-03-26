import { makeEnum } from '@transcend-io/type-utils';

/**
 * An identifier that can be used to communication with the data subject, also implies that the identifier is transcend supported
 */
export const CommunicationIdentifierType = makeEnum({
  /** An email address */
  Email: 'email',
  /** A phone number */
  Phone: 'phone',
});

/**
 * Overload with type of integration
 */
export type CommunicationIdentifierType =
  (typeof CommunicationIdentifierType)[keyof typeof CommunicationIdentifierType];

/**
 * The built in identification strategies
 */
export const IdentifierType = makeEnum({
  ...CommunicationIdentifierType,
  /** The core id of the organization (usually provided through login) */
  CoreIdentifier: 'coreIdentifier',
  /** A custom identifier */
  Custom: 'custom',
  /**
   * Google/Android mobile identifier
   *
   * @see https://www.singular.net/blog/google-advertising-id-gaid/
   * AKA adid - android advertising id
   */
  Gaid: 'gaid',
  /** Apple ios mobile identifier */
  Idfa: 'idfa',
  /**
   * The Identifier for Vendors
   *
   * @see https://developer.apple.com/documentation/uikit/uidevice/1620059-identifierforvendor
   */
  Idfv: 'idfv',
  /* Browser Id (such as browser fingerprint ID) */
  BrowserId: 'browserId',
  /** Microsoft Advertising Id */
  MicrosoftAdvertisingId: 'microsoftAdvertisingId',
  /** Amazon fire Advertising Id */
  AmazonFireAdvertisingId: 'amazonFireAdvertisingId',
  /**
   * Roku Advertising Id
   *
   * @see https://developer.roku.com/docs/developer-program/advertising/integrating-roku-advertising-framework.md
   */
  Rida: 'rida',
  /** The handle for the filestack file  */
  FilestackHandle: 'filestackHandle',
  /** An ID for a stripe user */
  StripeId: 'stripeId',
  /** The ID used to key braintree customer */
  BraintreeCustomerId: 'braintreeCustomerId',
  /** An ID for a chargebee user */
  ChargebeeId: 'chargebeeId',
  /** An ID for a Thrive TRM contact */
  thriveTrmContactId: 'thriveTrmContactId',
  /** Talkable uuid */
  TalkableUUID: 'talkableUUID',
  /** Recurly site account ID */
  RecurlyId: 'recurlyId',
  /** The customer.io ID - also known as cio_id */
  customerIoId: 'customerIoId',
  /** The visitorId for the Sprig integration */
  sprigVisitorId: 'sprigVisitorId',
  /** URL of a LinkedIn profile */
  linkedInURL: 'linkedInURL',
  /**
   * An advertising ID (for a mobile device)
   * TODO: https://transcend.height.app/T-13657 - remove this in favor of idfa and gpadvid
   */
  AdvertisingId: 'advertisingId',
  /** An ID for a Persona account */
  PersonaReferenceId: 'personaReferenceId',
  /** An ID for a Stream user */
  StreamUserId: 'streamUserId',
  /** A token used to make API calls on behalf of a Plaid account. */
  PlaidProcessorToken: 'plaidProcessorToken',
  /** An ID for an applicant on Onfido */
  OnfidoApplicantId: 'onfidoApplicantId',
  /** Custom ID for a Vero user */
  VeroUserId: 'veroUserId',
  /**
   * Adobe Privacy API ID's
   * https://experienceleague.adobe.com/en/docs/experience-platform/privacy/api/appendix#standard-namespaces
   */
  /** Adobe Advertising Cloud ID */
  AdobeAdvertisingCloudId: 'adobeAdvertisingCloudId',
  /** Adobe Audience Manager UUID */
  AdobeAudienceManagerId: 'adobeAudienceManagerId',
  /** Adobe Experience Cloud ID */
  AdobeExperienceCloudId: 'adobeExperienceCloudId',
  /** Adobe Target ID */
  AdobeTargetID: 'adobeTargetId',
  /** The special Transcend identifier on consent preference records */
  Transcend: 'transcend',
});

/**
 * Overload with type of integration
 */
export type IdentifierType = (typeof IdentifierType)[keyof typeof IdentifierType];
