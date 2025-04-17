// main
import { makeEnum } from '@transcend-io/type-utils';

/**
 * The options for the type of purpose that airgap classifies requests into
 */
export const SpecialTrackingPurpose = makeEnum({
  /** The request has an unknown tracking purpose */
  Unknown: 'Unknown',
  /** The request is necessary for the essential features of the website */
  Essential: 'Essential',
});

/** Type override */
export type SpecialTrackingPurpose =
  (typeof SpecialTrackingPurpose)[keyof typeof SpecialTrackingPurpose];

/**
 * Possible values for the default consent that can be given to a tracking purpose
 */
export const DefaultConsentValue = makeEnum({
  /** Tracking purpose is NOT consented to by default */
  Off: 'off',
  /**
   * Tracking purpose is consented to by default, unless user is protected by GDPR
   * or has DNT or GPC enabled
   */
  Auto: 'Auto',
});

/** Type override */
export type DefaultConsentValue =
  (typeof DefaultConsentValue)[keyof typeof DefaultConsentValue];

/**
 * Purposes that can be configured
 */
export const ConfigurablePurpose = makeEnum({
  /** SaaS tools used for advertising purposes */
  Advertising: 'Advertising',
  /** SaaS tools used for analytics purposes */
  Analytics: 'Analytics',
  /** SaaS tools used for functional purposes */
  Functional: 'Functional',
  /** SaaS tools used for selling personal information */
  SaleOfInfo: 'SaleOfInfo',
});

/** Type override */
export type ConfigurablePurpose =
  (typeof ConfigurablePurpose)[keyof typeof ConfigurablePurpose];

/**
 * Purposes that can be configured
 */
export const KnownDefaultPurpose = makeEnum({
  /** The request is necessary for the essential features of the website */
  Essential: 'Essential',
  ...ConfigurablePurpose,
});

/** Type override */
export type KnownDefaultPurpose =
  (typeof KnownDefaultPurpose)[keyof typeof KnownDefaultPurpose];

/**
 * Purposes used by the purpose map
 */
export const Purpose = makeEnum({
  ...SpecialTrackingPurpose,
  ...ConfigurablePurpose,
});

/** Type override */
export type Purpose = (typeof Purpose)[keyof typeof Purpose];
