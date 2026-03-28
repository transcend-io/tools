import { makeEnum } from '@transcend-io/type-utils';

/** Information that does not belong to an individual */
export const NotPersonalDataSubCategory = makeEnum({
  /** Fallback subcategory */
  NotPersonalData: 'NOT_PERSONAL_DATA',
});

/**
 * Overload with type of integration
 */
export type NotPersonalDataSubCategory =
  (typeof NotPersonalDataSubCategory)[keyof typeof NotPersonalDataSubCategory];
