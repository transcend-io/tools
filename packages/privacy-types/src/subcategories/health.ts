import { makeEnum } from '@transcend-io/type-utils';

/** Information about an individual's health */
export const HealthSubCategory = {
  /** Fallback subcategory */
  Health: 'HEALTH',
} as const;

/**
 * Overload with type of integration
 */
export type HealthSubCategory = (typeof HealthSubCategory)[keyof typeof HealthSubCategory];
