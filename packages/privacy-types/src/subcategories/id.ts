import { makeEnum } from '@transcend-io/type-utils';

/** Information that can be used to identify an individual */
export const IdSubCategory = makeEnum({
  /** A username associated with an individual */
  Username: 'USERNAME',
  /** A person's name */
  Name: 'NAME',
  /** An individual's (US) Social security number */
  SocialSecurityNumber: 'SOCIAL_SECURITY_NUMBER',
  /** Driver's license */
  DriversLicense: 'DRIVERS_LICENSE',
  /** Passport number */
  PassportNumber: 'PASSPORT_NUMBER',
  /** A digital representation of an individual's unique physical characteristics (e.g. fingerprint, retina or iris image, etc.) */
  BiometricIdentifier: 'BIOMETRIC_IDENTIFIER',
  /** The user ID */
  UserId: 'USER_ID',
  /** Fallback subcategory */
  Id: 'ID',
});

/**
 * Overload with type of integration
 */
export type IdSubCategory = (typeof IdSubCategory)[keyof typeof IdSubCategory];
