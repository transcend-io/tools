import { makeEnum } from '@transcend-io/type-utils';

export const HRPurposeSubCategory = {
  /** Fallback sub purpose */
  HR: 'HR',
} as const;

/**
 * Overload with type of integration
 */
export type HRPurposeSubCategory = (typeof HRPurposeSubCategory)[keyof typeof HRPurposeSubCategory];
