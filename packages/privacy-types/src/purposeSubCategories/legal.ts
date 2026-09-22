import { makeEnum } from '@transcend-io/type-utils';

export const LegalPurposeSubCategory = {
  /** Fallback sub purpose */
  Legal: 'LEGAL',
} as const;

/**
 * Overload with type of integration
 */
export type LegalPurposeSubCategory =
  (typeof LegalPurposeSubCategory)[keyof typeof LegalPurposeSubCategory];
