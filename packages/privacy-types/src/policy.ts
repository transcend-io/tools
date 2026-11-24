import { makeEnum } from '@transcend-io/type-utils';

/**
 * Type of Privacy Center policy
 */
export const PolicyType = {
  /** Standard privacy policy */
  PrivacyPolicy: 'PRIVACY_POLICY',
  /** Cookie / tracking technologies policy */
  CookiePolicy: 'COOKIE_POLICY',
  /** Custom policy */
  Custom: 'CUSTOM',
} as const;

/** Type override */
export type PolicyType = (typeof PolicyType)[keyof typeof PolicyType];

/**
 * OPA Data API `explain` option on `POST /v1/data/{path}`.
 *
 * @see https://www.openpolicyagent.org/docs/latest/rest-api/#query-api
 */
export const OPAExplainMode = {
  Notes: 'notes',
  Fails: 'fails',
  Full: 'full',
  Debug: 'debug',
} as const;

/** Type override */
export type OPAExplainMode = (typeof OPAExplainMode)[keyof typeof OPAExplainMode];
