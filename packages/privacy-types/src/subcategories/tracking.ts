import { makeEnum } from '@transcend-io/type-utils';

export const TrackingSubCategory = {
  // TODO: https://transcend.height.app/T-14003 - add more subcategories
  /** Fallback subcategory */
  Tracking: 'TRACKING',
} as const;

/**
 * Overload with type of integration
 */
export type TrackingSubCategory = (typeof TrackingSubCategory)[keyof typeof TrackingSubCategory];
