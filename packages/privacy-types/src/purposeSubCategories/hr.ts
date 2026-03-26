import { makeEnum } from '@transcend-io/type-utils';

export const HRPurposeSubCategory = makeEnum({
  /** Fallback sub purpose */
  HR: 'HR',
});

/**
 * Overload with type of integration
 */
export type HRPurposeSubCategory = (typeof HRPurposeSubCategory)[keyof typeof HRPurposeSubCategory];
