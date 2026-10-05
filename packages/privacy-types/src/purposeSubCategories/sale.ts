import { makeEnum } from '@transcend-io/type-utils';

export const SalePurposeSubCategory = {
  /** Fallback sub purpose */
  Sale: 'SALE',
} as const;

/**
 * Overload with type of integration
 */
export type SalePurposeSubCategory =
  (typeof SalePurposeSubCategory)[keyof typeof SalePurposeSubCategory];
