import { makeEnum } from '@transcend-io/type-utils';

export const LegalPurposeSubCategory = makeEnum({
  /** Fallback sub purpose */
  Legal: 'LEGAL',
});

/**
 * Overload with type of integration
 */
export type LegalPurposeSubCategory =
  (typeof LegalPurposeSubCategory)[keyof typeof LegalPurposeSubCategory];
