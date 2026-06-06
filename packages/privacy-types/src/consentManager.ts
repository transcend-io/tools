import { makeEnum } from '@transcend-io/type-utils';

/**
 * The source that set the data flow or cookie
 */
export enum ConsentTrackerSource {
  /** The data flow was manually set */
  Manual = 'MANUAL',
  /** The data flow originated from a site-scan */
  Scan = 'SCAN',
  /** Data flow originated from telemetry data */
  Telemetry = 'TELEMETRY',
}

/**
 * Statuses for a data flow or cookie
 */
export enum ConsentTrackerStatus {
  /** Data flows or cookies that are to be included in live airgap bundles */
  Live = 'LIVE',
  /** Data flows or cookies that won't be included in live airgap bundles because they need a human review */
  NeedsReview = 'NEEDS_REVIEW',
}

/**
 * Applicable data flow scopes for a given URL
 */
export const DataFlowScope = makeEnum({
  Host: 'HOST',
  Path: 'PATH',
  QueryParam: 'QUERY_PARAM',
  RegExp: 'REGEX',
  CSP: 'CSP',
});

/** Type override */
export type DataFlowScope = (typeof DataFlowScope)[keyof typeof DataFlowScope];

export const ConsentBundleType = makeEnum({
  /** Bundle hosted at /cm path */
  Production: 'PRODUCTION',
  /** Bundle hosted at /cm-test path */
  Test: 'TEST',
});

/** Override type */
export type ConsentBundleType = (typeof ConsentBundleType)[keyof typeof ConsentBundleType];

export const UnknownRequestPolicy = makeEnum({
  Allow: 'ALLOW',
  RequireFullConsent: 'REQUIRE_FULL_CONSENT',
  Block: 'BLOCK',
});

/** Override type */
export type UnknownRequestPolicy = (typeof UnknownRequestPolicy)[keyof typeof UnknownRequestPolicy];

export const TelemetryPartitionStrategy = makeEnum({
  /** Partition telemetry data by the origin (default) */
  Origin: 'origin',
  /** Partition telemetry data by the origin + path */
  Path: 'path',
  /** Partition telemetry data by the full URL */
  Url: 'url',
});

/** Override type */
export type TelemetryPartitionStrategy =
  (typeof TelemetryPartitionStrategy)[keyof typeof TelemetryPartitionStrategy];

/**
 * The possible options for configuring the Consent resolution precedence
 *
 * If this is set to 'user' (default), then confirmed consent is persisted, even
 * if the consent opts the user into tracking purposes opted out by the user's
 * detected privacy signals.
 *
 * If this is set to 'signals', then detected privacy signals always take precedence
 * over confirmed consent.
 */
export const ConsentPrecedenceOption = makeEnum({
  User: 'user',
  Signal: 'signal',
});

/** Override type */
export type ConsentPrecedenceOption =
  (typeof ConsentPrecedenceOption)[keyof typeof ConsentPrecedenceOption];

/**
 * The possible options for configuring the CSP
 *
 * These options are simplified for the UI.
 * Their equivalence in the airgap.js browser API:
 * Strict => strict
 * Lax => allow-subdomains allow-known-hosts
 * On => allow-subdomains
 * Off => off
 */
export const CspOption = makeEnum({
  Strict: 'Strict',
  Lax: 'Lax',
  On: 'On',
  Off: 'Off',
});

/** Override type */
export type CspOption = (typeof CspOption)[keyof typeof CspOption];

/**
 * Options for configuring the US Privacy API
 *
 * On
 * Off
 */
export const UspapiOption = makeEnum({
  On: 'on',
  Off: 'off',
});

/** Override type */
export type UspapiOption = (typeof UspapiOption)[keyof typeof UspapiOption];

/**
 * Options for configuring the US Privacy API
 *
 * Yes
 * No
 * Unknown
 */
export const SignedIabAgreementOption = makeEnum({
  Yes: 'yes',
  No: 'no',
  Unknown: 'unknown',
});

/** Override type */
export type SignedIabAgreementOption =
  (typeof SignedIabAgreementOption)[keyof typeof SignedIabAgreementOption];

/**
 * Describes whether listed countries/country subdivisions are included in an experience
 */
export const RegionsOperator = makeEnum({
  /** The listed countries/country subdivisions, time zones, and languages are included in this experience */
  In: 'IN',
  /** The listed countries/country subdivisions, time zones, and languages are NOT included in this experience */
  NotIn: 'NOT_IN',
});

/** Override type */
export type RegionsOperator = (typeof RegionsOperator)[keyof typeof RegionsOperator];

/**
 * Options for configuring Backend Sync
 *
 * On
 * Off
 */
export const BackendSyncOption = makeEnum({
  On: 'on',
  Off: 'off',
});

/** Override type */
export type BackendSyncOption = (typeof BackendSyncOption)[keyof typeof BackendSyncOption];

/**
 * Whether or not to run local on-device same-site cross-domain sync
 *
 * default: 'on'
 */
export const LocalSyncOption = makeEnum({
  /** use private sync only */
  Private: 'private',
  /** allow network-observable sync when private sync is unavailable */
  AllowNetworkObservable: 'allow-network-observable',
  /** comparable to 'allow-network-observable' -- allow network-observable sync when private sync is unavailble */
  On: 'on',
  /** disable local sync */
  Off: 'off',
});

/** Type override */
export type LocalSyncOption = (typeof LocalSyncOption)[keyof typeof LocalSyncOption];

/**
 * Sort direction for GraphQL order-by queries
 */
export const OrderDirection = makeEnum({
  Asc: 'ASC',
  Desc: 'DESC',
});

/** Override type */
export type OrderDirection = (typeof OrderDirection)[keyof typeof OrderDirection];

/**
 * The possible options for configuring default consent
 *
 * These options are simplified for the UI.
 * Their equivalence in the airgap.js browser API:
 * Opt-in => 'off' / false
 * Opt-out (unless for any reason not to; legal or otherwise) => 'Auto'
 */
export const DefaultConsentOption = makeEnum({
  OptIn: 'off',
  OptOut: 'Auto',
});

/** Override type */
export type DefaultConsentOption = (typeof DefaultConsentOption)[keyof typeof DefaultConsentOption];

/**
 * Fields by which you can order cookies
 */
export const CookieOrderField = makeEnum({
  /** The name of this cookie */
  Name: 'name',
  /** When the cookie was created */
  CreatedAt: 'createdAt',
  /** The time the cookie was updated */
  UpdatedAt: 'updatedAt',
});

/** Type override */
export type CookieOrderField = (typeof CookieOrderField)[keyof typeof CookieOrderField];

/**
 * Fields by which you can order data flows
 */
export const DataFlowOrderField = makeEnum({
  /** The value of this data flow */
  Value: 'value',
  /** When the data flow was created */
  CreatedAt: 'createdAt',
  /** The time the data flow was updated */
  UpdatedAt: 'updatedAt',
  /** The number of occurrences of this data flow */
  Occurrences: 'occurrences',
  /** The SaaS tool associated with these data flows */
  Service: 'service',
});

/** Type override */
export type DataFlowOrderField = (typeof DataFlowOrderField)[keyof typeof DataFlowOrderField];

/**
 * Types of data flows
 */
export const DataFlowType = makeEnum({
  /** URL-based data flow */
  Url: 'URL',
  /** Query parameter-based data flow */
  QueryParam: 'QUERY_PARAM',
  /** Regular expression-based data flow */
  RegExp: 'REGEX',
});

/** Type override */
export type DataFlowType = (typeof DataFlowType)[keyof typeof DataFlowType];

/**
 * Triage actions for consent bulk operations
 */
export const TriageAction = makeEnum({
  /** Approve the tracker */
  Approve: 'APPROVE',
  /** Mark the tracker as junk */
  Junk: 'JUNK',
});

/** Type override */
export type TriageAction = (typeof TriageAction)[keyof typeof TriageAction];

/**
 * Discriminator for cookie vs data flow
 */
export const ConsentTrackerType = makeEnum({
  /** Cookie tracker */
  Cookie: 'cookie',
  /** Data flow tracker */
  DataFlow: 'data_flow',
});

/** Type override */
export type ConsentTrackerType = (typeof ConsentTrackerType)[keyof typeof ConsentTrackerType];
