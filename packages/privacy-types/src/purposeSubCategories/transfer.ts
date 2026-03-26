import { makeEnum } from '@transcend-io/type-utils';

export const TransferPurposeSubCategory = makeEnum({
  /** Fallback sub purpose */
  Transfer: 'TRANSFER',
});

/**
 * Overload with type of integration
 */
export type TransferPurposeSubCategory =
  (typeof TransferPurposeSubCategory)[keyof typeof TransferPurposeSubCategory];
