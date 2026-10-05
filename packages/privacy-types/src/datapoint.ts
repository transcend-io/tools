import { makeEnum } from '@transcend-io/type-utils';

export const ConfidenceLabel = {
  High: 'HIGH',
  Medium: 'MEDIUM',
  Low: 'LOW',
} as const;

/** Override types */
export type ConfidenceLabel = (typeof ConfidenceLabel)[keyof typeof ConfidenceLabel];

/** The approval status of the category guess for a subdatapoint */
export const SubDataPointDataSubCategoryGuessStatus = {
  /** The guess has been approved as valid */
  Approved: 'APPROVED',
  /** The guess is pending review */
  Pending: 'PENDING',
  /** The guess has been marked as wrong */
  Rejected: 'REJECTED',
} as const;

/** Type override */
export type SubDataPointDataSubCategoryGuessStatus =
  (typeof SubDataPointDataSubCategoryGuessStatus)[keyof typeof SubDataPointDataSubCategoryGuessStatus];

export const UnstructuredSubDataPointRecommendationStatus = {
  /** The category was manually applied */
  ManuallyAdded: 'MANUALLY_ADDED',
  /** The recommendation has been corrected */
  Corrected: 'CORRECTED',
  /** The recommendation has been approved as valid */
  Validated: 'VALIDATED',
  /** The recommendation is has been made but not validated */
  Classified: 'CLASSIFIED',
  /** The recommendation has been marked as wrong */
  Rejected: 'REJECTED',
} as const;

/** Type override */
export type UnstructuredSubDataPointRecommendationStatus =
  (typeof UnstructuredSubDataPointRecommendationStatus)[keyof typeof UnstructuredSubDataPointRecommendationStatus];

/**
 * Encryption types for database table
 */
export const TableEncryptionType = {
  Unencrypted: 'UNENCRYPTED',
  EncryptedApplicationSide: 'ENCRYPTED_APPLICATION_SIDE',
  EncryptedByDataAtRest: 'ENCRYPTED_DATA_AT_REST',
} as const;

/** Type override */
export type TableEncryptionType = (typeof TableEncryptionType)[keyof typeof TableEncryptionType];

export const Controllership = {
  /** The current organization is a controller of the data */
  Controller: 'CONTROLLER',
  /** The current organization is a processor of the data */
  Processor: 'PROCESSOR',
  /** The current organization is a joint controller of the data */
  JointController: 'JOINT_CONTROLLER',
} as const;

/** Type override */
export type Controllership = (typeof Controllership)[keyof typeof Controllership];

/** The type of retention schedule for personal data */
export const RetentionType = {
  /** Collected user information is deleted, anonymized or aggregated after a specific time period */
  StatedPeriod: 'STATED_PERIOD',
  /** Data is deleted, anonymized, or aggregated at some point, but no specific retention period is stated */
  Limited: 'LIMITED',
  /** Collected user information is retained indefinitely */
  Indefinite: 'INDEFINITE',
  /** A specific retention type not covered above */
  Other: 'OTHER',
  /** Retention period is not stated or unclear */
  Unspecified: 'UNSPECIFIED',
} as const;

/** Type override */
export type RetentionType = (typeof RetentionType)[keyof typeof RetentionType];
