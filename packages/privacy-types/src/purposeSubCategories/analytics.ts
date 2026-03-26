import { makeEnum } from '@transcend-io/type-utils';

export const AnalyticsPurposeSubCategory = makeEnum({
  /** Fallback sub purpose */
  Analytics: 'ANALYTICS',
});

/**
 * Overload with type of integration
 */
export type AnalyticsPurposeSubCategory =
  (typeof AnalyticsPurposeSubCategory)[keyof typeof AnalyticsPurposeSubCategory];
