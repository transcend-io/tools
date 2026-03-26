import { makeEnum } from '@transcend-io/type-utils';

export const OtherPurposeSubCategory = makeEnum({
  /** Fallback sub purpose */
  Other: 'Other',
});

/**
 * Overload with type of integration
 */
export type OtherPurposeSubCategory =
  (typeof OtherPurposeSubCategory)[keyof typeof OtherPurposeSubCategory];
