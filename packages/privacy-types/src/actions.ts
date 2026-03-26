import { invert, makeEnum } from '@transcend-io/type-utils';

/**
 * The type of requests that allow for opt-out
 */
export const RequestActionOptOut = makeEnum({
  /** Opt out of automated decision making */
  AutomatedDecisionMakingOptOut: 'AUTOMATED_DECISION_MAKING_OPT_OUT',
  /** Ability to opt out of the use of sensitive information. A requirement under the CPRA and similar laws. */
  UseOfSensitiveInformationOptOut: 'USE_OF_SENSITIVE_INFORMATION_OPT_OUT',
  /** Opt out of all communication */
  ContactOptOut: 'CONTACT_OPT_OUT',
  /** Opt-out of the sale of personal data */
  SaleOptOut: 'SALE_OPT_OUT',
  /** Opt out of tracking */
  TrackingOptOut: 'TRACKING_OPT_OUT',
  /** Opt out custom */
  CustomOptOut: 'CUSTOM_OPT_OUT',
});

/** Type override */
export type RequestActionOptOut = (typeof RequestActionOptOut)[keyof typeof RequestActionOptOut];

/**
 * The type of requests that allow for opt-in
 */
export const RequestActionOptIn = makeEnum({
  /** Opt in to automated decision making */
  AutomatedDecisionMakingOptIn: 'AUTOMATED_DECISION_MAKING_OPT_IN',
  /** Ability to opt in to the use of sensitive information. A requirement under the CPRA and similar laws. */
  UseOfSensitiveInformationOptIn: 'USE_OF_SENSITIVE_INFORMATION_OPT_IN',
  /** Opt-in to the sale of personal data */
  SaleOptIn: 'SALE_OPT_IN',
  /** Opt in to tracking */
  TrackingOptIn: 'TRACKING_OPT_IN',
  /** Opt in to contact */
  ContactOptIn: 'CONTACT_OPT_IN',
  /** Opt in custom */
  CustomOptIn: 'CUSTOM_OPT_IN',
});

/** Type override */
export type RequestActionOptIn = (typeof RequestActionOptIn)[keyof typeof RequestActionOptIn];

/**
 * Mapping between request actions that are inverses
 * of one another.
 */
export const REQUEST_ACTION_OPT_OUT_TO_OPT_IN: {
  [k in RequestActionOptOut]: RequestActionOptIn;
} = {
  [RequestActionOptOut.AutomatedDecisionMakingOptOut]:
    RequestActionOptIn.AutomatedDecisionMakingOptIn,
  [RequestActionOptOut.UseOfSensitiveInformationOptOut]:
    RequestActionOptIn.UseOfSensitiveInformationOptIn,
  [RequestActionOptOut.ContactOptOut]: RequestActionOptIn.ContactOptIn,
  [RequestActionOptOut.TrackingOptOut]: RequestActionOptIn.TrackingOptIn,
  [RequestActionOptOut.SaleOptOut]: RequestActionOptIn.SaleOptIn,
  [RequestActionOptOut.CustomOptOut]: RequestActionOptIn.CustomOptIn,
};
export const REQUEST_ACTION_OPT_IN_TO_OPT_OUT = invert(REQUEST_ACTION_OPT_OUT_TO_OPT_IN);

/**
 * An request action resolve types that can be run at the object level
 */
export const RequestActionObjectResolver = makeEnum({
  /** Data Download request */
  Access: 'ACCESS',
  /** Erase the file completely */
  Erasure: 'ERASURE',
  /** Make an update to an inaccurate record */
  Rectification: 'RECTIFICATION',
  /** A restriction of processing request */
  Restriction: 'RESTRICTION',
  /** Business Purpose Report */
  BusinessPurpose: 'BUSINESS_PURPOSE',
  /** Add user to a legal hold */
  PlaceOnLegalHold: 'PLACE_ON_LEGAL_HOLD',
  /** Remove a user from a legal hold */
  RemoveFromLegalHold: 'REMOVE_FROM_LEGAL_HOLD',
  ...RequestActionOptOut,
  ...RequestActionOptIn,
});

/** Type override */
export type RequestActionObjectResolver =
  (typeof RequestActionObjectResolver)[keyof typeof RequestActionObjectResolver];

/**
 * The privacy actions that can be set at the object level for a
 * data silo configured as webhook or cron integration.
 *
 * Privacy actions are specified globally and logic is left to the
 * webhook service to implement. The individual objects can still be
 * labeled for whether they should be included in data access requests.
 */
export const InternalDataSiloObjectResolver = makeEnum({
  /** Data Download request */
  Access: 'ACCESS',
});

/** Type override */
export type InternalDataSiloObjectResolver =
  (typeof InternalDataSiloObjectResolver)[keyof typeof InternalDataSiloObjectResolver];

/**
 * The types of requests that Data Subject can make
 */
export const RequestAction = makeEnum({
  ...RequestActionOptOut,
  ...RequestActionOptIn,
  /** Data Download request */
  Access: 'ACCESS',
  /** Erase the profile from the system */
  Erasure: 'ERASURE',
  /** Make an update to an inaccurate record */
  Rectification: 'RECTIFICATION',
  /** Restrict processing */
  Restriction: 'RESTRICTION',
  /** Business Purpose Report */
  BusinessPurpose: 'BUSINESS_PURPOSE',
  /** Add user to a legal hold */
  PlaceOnLegalHold: 'PLACE_ON_LEGAL_HOLD',
  /** Remove a user from a legal hold */
  RemoveFromLegalHold: 'REMOVE_FROM_LEGAL_HOLD',
});

/** Type override */
export type RequestAction = (typeof RequestAction)[keyof typeof RequestAction];
