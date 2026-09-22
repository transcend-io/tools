import { makeEnum } from '@transcend-io/type-utils';

export const EssentialPurposeSubCategory = {
  /** Fallback sub purpose */
  Essential: 'ESSENTIAL',
} as const;

/**
 * Overload with type of integration
 */
export type EssentialPurposeSubCategory =
  (typeof EssentialPurposeSubCategory)[keyof typeof EssentialPurposeSubCategory];
