import { makeEnum } from '@transcend-io/type-utils';

export const MarketingPurposeSubCategory = makeEnum({
  /** Fallback sub purpose */
  Marketing: 'MARKETING',
});

/**
 * Overload with type of integration
 */
export type MarketingPurposeSubCategory =
  (typeof MarketingPurposeSubCategory)[keyof typeof MarketingPurposeSubCategory];
