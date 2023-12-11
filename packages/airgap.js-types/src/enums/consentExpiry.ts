import { makeEnum } from '@transcend-io/type-utils';

/**
 * Enum of options available for behavior to exhibit when the user's consent has expired
 */
export const OnConsentExpiry = makeEnum({
  /** Reprompts the user to change or confirm their selection */
  Prompt: 'Prompt',
  /** Resets the user's consent and reprompts them */
  ResetAll: 'ResetAll',
  /** Resets the user's opted-in purposes and reprompts them */
  ResetOptIns: 'ResetOptIns',
});
/** Override type */
export type OnConsentExpiry =
  typeof OnConsentExpiry[keyof typeof OnConsentExpiry];
