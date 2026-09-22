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
