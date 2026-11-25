/**
 * Immutable class for a data subject type (GraphQL {@link DataSubjectClass}).
 */
export const DataSubjectClass = {
  /** Consumer or end-user data subject */
  EndUser: 'END_USER',
  /** Employee data subject */
  Employee: 'EMPLOYEE',
  /** Business contact data subject */
  BusinessContact: 'BUSINESS_CONTACT',
  /** Other / uncategorized data subject */
  Other: 'OTHER',
} as const;

/** Data subject class value */
export type DataSubjectClass = (typeof DataSubjectClass)[keyof typeof DataSubjectClass];
