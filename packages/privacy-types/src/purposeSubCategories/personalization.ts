import { makeEnum } from '@transcend-io/type-utils';

export const PersonalizationPurposeSubCategory = {
  /** Fallback sub purpose */
  Personalization: 'PERSONALIZATION',
} as const;

/**
 * Overload with type of integration
 */
export type PersonalizationPurposeSubCategory =
  (typeof PersonalizationPurposeSubCategory)[keyof typeof PersonalizationPurposeSubCategory];
