import { makeEnum } from '@transcend-io/type-utils';

export const EssentialPurposeSubCategory = makeEnum({
  /** Fallback sub purpose */
  Essential: 'ESSENTIAL',
});

/**
 * Overload with type of integration
 */
export type EssentialPurposeSubCategory =
  (typeof EssentialPurposeSubCategory)[keyof typeof EssentialPurposeSubCategory];
