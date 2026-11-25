import { makeEnum } from '@transcend-io/type-utils';

export const MarketingPurposeSubCategory = {
  /** Fallback sub purpose */
  Marketing: 'MARKETING',
} as const;

/**
 * Overload with type of integration
 */
export type MarketingPurposeSubCategory =
  (typeof MarketingPurposeSubCategory)[keyof typeof MarketingPurposeSubCategory];
