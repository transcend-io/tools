import { makeEnum } from '@transcend-io/type-utils';

export const LocationSubCategory = makeEnum({
  /** Fallback subcategory */
  Location: 'LOCATION',
});

/**
 * Overload with type of integration
 */
export type LocationSubCategory = (typeof LocationSubCategory)[keyof typeof LocationSubCategory];
