import { makeEnum } from '@transcend-io/type-utils';

export const AdvertisingPurposeSubCategory = makeEnum({
  /** Fallback sub purpose */
  Advertising: 'ADVERTISING',
});

/**
 * Overload with type of integration
 */
export type AdvertisingPurposeSubCategory =
  (typeof AdvertisingPurposeSubCategory)[keyof typeof AdvertisingPurposeSubCategory];
