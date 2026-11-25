import { makeEnum } from '@transcend-io/type-utils';

export const OtherPurposeSubCategory = {
  /** Fallback sub purpose */
  Other: 'Other',
} as const;

/**
 * Overload with type of integration
 */
export type OtherPurposeSubCategory =
  (typeof OtherPurposeSubCategory)[keyof typeof OtherPurposeSubCategory];
