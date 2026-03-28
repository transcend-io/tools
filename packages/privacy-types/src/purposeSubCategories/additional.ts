import { makeEnum } from '@transcend-io/type-utils';

export const AdditionalPurposeSubCategory = makeEnum({
  /** Fallback sub purpose */
  Additional: 'ADDITIONAL',
});

/**
 * Overload with type of integration
 */
export type AdditionalPurposeSubCategory =
  (typeof AdditionalPurposeSubCategory)[keyof typeof AdditionalPurposeSubCategory];
