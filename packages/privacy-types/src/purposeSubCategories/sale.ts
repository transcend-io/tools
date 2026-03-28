import { makeEnum } from '@transcend-io/type-utils';

export const SalePurposeSubCategory = makeEnum({
  /** Fallback sub purpose */
  Sale: 'SALE',
});

/**
 * Overload with type of integration
 */
export type SalePurposeSubCategory =
  (typeof SalePurposeSubCategory)[keyof typeof SalePurposeSubCategory];
