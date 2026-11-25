import { makeEnum } from '@transcend-io/type-utils';

export const TransferPurposeSubCategory = {
  /** Fallback sub purpose */
  Transfer: 'TRANSFER',
} as const;

/**
 * Overload with type of integration
 */
export type TransferPurposeSubCategory =
  (typeof TransferPurposeSubCategory)[keyof typeof TransferPurposeSubCategory];
