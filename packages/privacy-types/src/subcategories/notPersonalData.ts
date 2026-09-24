import { makeEnum } from '@transcend-io/type-utils';

/** Information that does not belong to an individual */
export const NotPersonalDataSubCategory = {
  /** Fallback subcategory */
  NotPersonalData: 'NOT_PERSONAL_DATA',
} as const;

/**
 * Overload with type of integration
 */
export type NotPersonalDataSubCategory =
  (typeof NotPersonalDataSubCategory)[keyof typeof NotPersonalDataSubCategory];
