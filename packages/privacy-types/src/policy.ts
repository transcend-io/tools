import { makeEnum } from '@transcend-io/type-utils';

/**
 * Type of Privacy Center policy
 */
export const PolicyType = makeEnum({
  /** Standard privacy policy */
  PrivacyPolicy: 'PRIVACY_POLICY',
  /** Cookie / tracking technologies policy */
  CookiePolicy: 'COOKIE_POLICY',
  /** Custom policy */
  Custom: 'CUSTOM',
});

/** Type override */
export type PolicyType = (typeof PolicyType)[keyof typeof PolicyType];
