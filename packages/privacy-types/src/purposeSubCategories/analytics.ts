import { makeEnum } from '@transcend-io/type-utils';

export const AnalyticsPurposeSubCategory = {
  /** Fallback sub purpose */
  Analytics: 'ANALYTICS',
} as const;

/**
 * Overload with type of integration
 */
export type AnalyticsPurposeSubCategory =
  (typeof AnalyticsPurposeSubCategory)[keyof typeof AnalyticsPurposeSubCategory];
