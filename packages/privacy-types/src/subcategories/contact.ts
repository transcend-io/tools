import { makeEnum } from '@transcend-io/type-utils';

export const ContactSubCategory = {
  /** An email address */
  Email: 'EMAIL',
  /** A phone number */
  Phone: 'PHONE',
  /** Fallback subcategory */
  Contact: 'CONTACT',
} as const;

/**
 * Overload with type of integration
 */
export type ContactSubCategory = (typeof ContactSubCategory)[keyof typeof ContactSubCategory];
