import { makeEnum } from '@transcend-io/type-utils';

export const OperationSecurityPurposeSubCategory = {
  /** Fallback sub purpose */
  OperationSecurity: 'OPERATION_SECURITY',
} as const;

/**
 * Overload with type of integration
 */
export type OperationSecurityPurposeSubCategory =
  (typeof OperationSecurityPurposeSubCategory)[keyof typeof OperationSecurityPurposeSubCategory];
