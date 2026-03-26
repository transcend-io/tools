import { makeEnum } from '@transcend-io/type-utils';

export const PersonalizationPurposeSubCategory = makeEnum({
  /** Fallback sub purpose */
  Personalization: 'PERSONALIZATION',
});

/**
 * Overload with type of integration
 */
export type PersonalizationPurposeSubCategory =
  (typeof PersonalizationPurposeSubCategory)[keyof typeof PersonalizationPurposeSubCategory];
