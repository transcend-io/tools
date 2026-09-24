import { makeEnum } from '@transcend-io/type-utils';

export const AdditionalPurposeSubCategory = {
  /** Fallback sub purpose */
  Additional: 'ADDITIONAL',
} as const;

/**
 * Overload with type of integration
 */
export type AdditionalPurposeSubCategory =
  (typeof AdditionalPurposeSubCategory)[keyof typeof AdditionalPurposeSubCategory];
