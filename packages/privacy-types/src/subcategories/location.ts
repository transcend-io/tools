import { makeEnum } from '@transcend-io/type-utils';

export const LocationSubCategory = {
  /** Approximate geolocation */
  ApproximateLocation: 'APPROXIMATE_LOCATION',
  /** Fallback subcategory */
  Location: 'LOCATION',
} as const;

/**
 * Overload with type of integration
 */
export type LocationSubCategory = (typeof LocationSubCategory)[keyof typeof LocationSubCategory];
