import { makeEnum } from '@transcend-io/type-utils';

/**
 * The status of a DPIA with a particular processing activity
 */
export const DataProtectionImpactAssessmentStatus = makeEnum({
  /** There is a link associated with this processing activity's DPIA */
  Link: 'LINK',
  /** There is no DPIA required for this processing activity */
  NotRequired: 'NOT_REQUIRED',
  /** The DPIA for this processing activity is missing */
  Missing: 'MISSING',
});

/** Type override */
export type DataProtectionImpactAssessmentStatus =
  (typeof DataProtectionImpactAssessmentStatus)[keyof typeof DataProtectionImpactAssessmentStatus];
