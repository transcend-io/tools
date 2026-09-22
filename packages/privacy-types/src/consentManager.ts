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
export const DataFlowScope = {
  Host: 'HOST',
  Path: 'PATH',
  QueryParam: 'QUERY_PARAM',
  RegExp: 'REGEX',
  CSP: 'CSP',
} as const;

/** Type override */
export type DataFlowScope = (typeof DataFlowScope)[keyof typeof DataFlowScope];

export const ConsentBundleType = {
  /** Bundle hosted at /cm path */
  Production: 'PRODUCTION',
  /** Bundle hosted at /cm-test path */
  Test: 'TEST',
} as const;

/** Override type */
export type ConsentBundleType = (typeof ConsentBundleType)[keyof typeof ConsentBundleType];

export const UnknownRequestPolicy = {
  Allow: 'ALLOW',
  RequireFullConsent: 'REQUIRE_FULL_CONSENT',
  Block: 'BLOCK',
} as const;

/** Override type */
export type UnknownRequestPolicy = (typeof UnknownRequestPolicy)[keyof typeof UnknownRequestPolicy];

export const TelemetryPartitionStrategy = {
  /** Partition telemetry data by the origin (default) */
  Origin: 'origin',
  /** Partition telemetry data by the origin + path */
  Path: 'path',
  /** Partition telemetry data by the full URL */
  Url: 'url',
} as const;

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
export const ConsentPrecedenceOption = {
  User: 'user',
  /**
   * @deprecated Use Signals instead
   */
  Signal: 'signal',
  /** Detected privacy signals take precedence over confirmed consent */
  Signals: 'signals',
} as const;

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
export const CspOption = {
  Strict: 'Strict',
  Lax: 'Lax',
  On: 'On',
  Off: 'Off',
} as const;

/** Override type */
export type CspOption = (typeof CspOption)[keyof typeof CspOption];

/**
 * Options for configuring the US Privacy API
 *
 * On
 * Off
 */
export const UspapiOption = {
  On: 'on',
  Off: 'off',
} as const;

/** Override type */
export type UspapiOption = (typeof UspapiOption)[keyof typeof UspapiOption];

/**
 * Options for configuring the US Privacy API
 *
 * Yes
 * No
 * Unknown
 */
export const SignedIabAgreementOption = {
  Yes: 'yes',
  No: 'no',
  Unknown: 'unknown',
} as const;

/** Override type */
export type SignedIabAgreementOption =
  (typeof SignedIabAgreementOption)[keyof typeof SignedIabAgreementOption];

/**
 * Describes whether listed countries/country subdivisions are included in an experience
 */
export const RegionsOperator = {
  /** The listed countries/country subdivisions, time zones, and languages are included in this experience */
  In: 'IN',
  /** The listed countries/country subdivisions, time zones, and languages are NOT included in this experience */
  NotIn: 'NOT_IN',
} as const;

/** Override type */
export type RegionsOperator = (typeof RegionsOperator)[keyof typeof RegionsOperator];

/**
 * Options for configuring Backend Sync
 *
 * On
 * Off
 */
export const BackendSyncOption = {
  On: 'on',
  Off: 'off',
} as const;

/** Override type */
export type BackendSyncOption = (typeof BackendSyncOption)[keyof typeof BackendSyncOption];

/**
 * Whether or not to run local on-device same-site cross-domain sync
 *
 * default: 'on'
 */
export const LocalSyncOption = {
  /** use private sync only */
  Private: 'private',
  /** allow network-observable sync when private sync is unavailable */
  AllowNetworkObservable: 'allow-network-observable',
  /** comparable to 'allow-network-observable' -- allow network-observable sync when private sync is unavailble */
  On: 'on',
  /** disable local sync */
  Off: 'off',
} as const;

/** Type override */
export type LocalSyncOption = (typeof LocalSyncOption)[keyof typeof LocalSyncOption];

/**
 * Sort direction for GraphQL order-by queries
 */
export const OrderDirection = {
  Asc: 'ASC',
  Desc: 'DESC',
} as const;

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
export const DefaultConsentOption = {
  OptIn: 'off',
  OptOut: 'Auto',
} as const;

/** Override type */
export type DefaultConsentOption = (typeof DefaultConsentOption)[keyof typeof DefaultConsentOption];

/**
 * Fields by which you can order cookies
 */
export const CookieOrderField = {
  /** The name of this cookie */
  Name: 'name',
  /** When the cookie was created */
  CreatedAt: 'createdAt',
  /** The time the cookie was updated */
  UpdatedAt: 'updatedAt',
  /** The number of occurrences (traffic) of this cookie */
  Occurrences: 'occurrences',
} as const;

/** Type override */
export type CookieOrderField = (typeof CookieOrderField)[keyof typeof CookieOrderField];

/**
 * Fields by which you can order data flows
 */
export const DataFlowOrderField = {
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
} as const;

/** Type override */
export type DataFlowOrderField = (typeof DataFlowOrderField)[keyof typeof DataFlowOrderField];

/**
 * Types of data flows
 */
export const DataFlowType = {
  /** URL-based data flow */
  Url: 'URL',
  /** Query parameter-based data flow */
  QueryParam: 'QUERY_PARAM',
  /** Regular expression-based data flow */
  RegExp: 'REGEX',
} as const;

/** Type override */
export type DataFlowType = (typeof DataFlowType)[keyof typeof DataFlowType];

/**
 * Triage actions for consent bulk operations
 */
export const TriageAction = {
  /** Approve the tracker */
  Approve: 'APPROVE',
  /** Mark the tracker as junk */
  Junk: 'JUNK',
} as const;

/** Type override */
export type TriageAction = (typeof TriageAction)[keyof typeof TriageAction];

/**
 * Discriminator for cookie vs data flow
 */
export const ConsentTrackerType = {
  /** Cookie tracker */
  Cookie: 'cookie',
  /** Data flow tracker */
  DataFlow: 'data_flow',
} as const;

/** Type override */
export type ConsentTrackerType = (typeof ConsentTrackerType)[keyof typeof ConsentTrackerType];

/**
 * Metrics supported by airgap bundle aggregate/timeseries analytics
 */
export const AirgapBundleAnalyticsMetric = {
  /** User opt-in or opt-out for a consent purpose */
  ConsentChanged: 'CONSENT_CHANGED',
  /** Privacy signal detected (e.g. GPC, DNT) */
  SignalDetected: 'SIGNAL_DETECTED',
  /** Site session recorded */
  SiteSessions: 'SITE_SESSIONS',
  /** Page view recorded */
  PageViews: 'PAGE_VIEWS',
} as const;

/** Type override */
export type AirgapBundleAnalyticsMetric =
  (typeof AirgapBundleAnalyticsMetric)[keyof typeof AirgapBundleAnalyticsMetric];

/**
 * Dimensions available for aggregate consent analytics breakdowns
 */
export const AirgapBundleAnalyticsDimension = {
  /** Consent value after change (true = opted in, false = opted out) */
  NewValue: 'NEW_VALUE',
  /** Privacy regime active when the event was recorded */
  Regime: 'REGIME',
  /** Tracking purpose the event relates to */
  Purpose: 'PURPOSE',
} as const;

/** Type override */
export type AirgapBundleAnalyticsDimension =
  (typeof AirgapBundleAnalyticsDimension)[keyof typeof AirgapBundleAnalyticsDimension];

/**
 * Bin sizes for airgap bundle timeseries analytics
 */
export const AirgapBundleAnalyticsBinInterval = {
  /** One minute bins */
  Minute: '1m',
  /** One hour bins */
  Hourly: '1h',
  /** One day bins */
  Daily: '1d',
} as const;

/** Type override */
export type AirgapBundleAnalyticsBinInterval =
  (typeof AirgapBundleAnalyticsBinInterval)[keyof typeof AirgapBundleAnalyticsBinInterval];

/**
 * analyticsData sources for consent manager metrics
 */
export const ConsentManagerAnalyticsDataSource = {
  /** DNT/GPC and other privacy signal counts over time */
  PrivacySignalTimeseries: 'PRIVACY_SIGNAL_TIMESERIES',
  /** Explicit opt-in/opt-out events over time */
  ConsentChangesTimeseries: 'CONSENT_CHANGES_TIMESERIES',
  /** Session counts grouped by privacy regime */
  ConsentSessionsByRegime: 'CONSENT_SESSIONS_BY_REGIME',
} as const;

/** Type override */
export type ConsentManagerAnalyticsDataSource =
  (typeof ConsentManagerAnalyticsDataSource)[keyof typeof ConsentManagerAnalyticsDataSource];

/**
 * Allowed bin sizes for consent manager analyticsData queries
 */
export const ConsentManagerMetricBin = {
  /** One hour bins */
  Hourly: '1h',
  /** One day bins */
  Daily: '1d',
} as const;

/** Type override */
export type ConsentManagerMetricBin =
  (typeof ConsentManagerMetricBin)[keyof typeof ConsentManagerMetricBin];
