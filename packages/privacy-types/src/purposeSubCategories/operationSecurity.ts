import { makeEnum } from '@transcend-io/type-utils';

export const OperationSecurityPurposeSubCategory = makeEnum({
  /** Fallback sub purpose */
  OperationSecurity: 'OPERATION_SECURITY',
});

/**
 * Overload with type of integration
 */
export type OperationSecurityPurposeSubCategory =
  (typeof OperationSecurityPurposeSubCategory)[keyof typeof OperationSecurityPurposeSubCategory];
