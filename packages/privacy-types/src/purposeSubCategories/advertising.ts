import { makeEnum } from '@transcend-io/type-utils';

export const AdvertisingPurposeSubCategory = {
  /** Fallback sub purpose */
  Advertising: 'ADVERTISING',
} as const;

/**
 * Overload with type of integration
 */
export type AdvertisingPurposeSubCategory =
  (typeof AdvertisingPurposeSubCategory)[keyof typeof AdvertisingPurposeSubCategory];
