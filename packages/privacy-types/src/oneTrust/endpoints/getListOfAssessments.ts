import * as t from 'io-ts';

/**
 * reference: https://developer.onetrust.com/onetrust/reference/getallassessmentbasicdetailsusingget
 * Return types of the "Get List of Assessments" endpoint
 */
export const OneTrustAssessment = t.type({
  /** ID of the assessment. */
  assessmentId: t.string,
  /** Date that the assessment was created. */
  createDt: t.string,
  /** Overall risk score without considering existing controls. */
  inherentRiskScore: t.union([t.number, t.null]),
  /** Date and time that the assessment was last updated. */
  lastUpdated: t.string,
  /** Name of the assessment. */
  name: t.string,
  /** Number assigned to the assessment. */
  number: t.number,
  /** Number of risks that are open on the assessment. */
  openRiskCount: t.number,
  /** Name of the organization group assigned to the assessment. */
  orgGroupName: t.string,
  /** Details about the inventory record which is the primary record of the assessment. */
  primaryInventoryDetails: t.union([
    t.type({
      /** GUID of the inventory record. */
      primaryInventoryId: t.string,
      /** Name of the inventory record. */
      primaryInventoryName: t.string,
      /** Integer ID of the inventory record. */
      primaryInventoryNumber: t.number,
    }),
    t.null,
  ]),
  /** Overall risk score after considering existing controls. */
  residualRiskScore: t.union([t.number, t.null]),
  /** Result of the assessment. NOTE: This field will be deprecated soon. Please reference the 'resultName' field instead. */
  result: t.union([
    t.literal('Approved'),
    t.literal('AutoClosed'),
    t.literal('Rejected'),
    t.string,
    t.null,
  ]),
  /** ID of the result. */
  resultId: t.union([t.string, t.null]),
  /** Name of the result. */
  resultName: t.union([
    t.literal('Approved - Remediation required'),
    t.literal('Approved'),
    t.literal('Rejected'),
    t.literal('Assessment suspended - On Hold'),
    t.string,
    t.null,
  ]),
  /** State of the assessment. */
  state: t.union([t.literal('ARCHIVE'), t.literal('ACTIVE')]),
  /** Status of the assessment. */
  status: t.union([
    t.literal('Not Started'),
    t.literal('In Progress'),
    t.literal('Under Review'),
    t.literal('Completed'),
    t.null,
  ]),
  /** Name of the tag attached to the assessment. */
  tags: t.array(t.string),
  /** The desired risk score. */
  targetRiskScore: t.union([t.number, t.null]),
  /** ID used to launch an assessment using a specific version of a template. */
  templateId: t.string,
  /**  Name of the template that is being used on the assessment. */
  templateName: t.string,
  /** ID used to launch an assessment using the latest published version of a template. */
  templateRootVersionId: t.string,
});

/** Type override */
export type OneTrustAssessment = t.TypeOf<typeof OneTrustAssessment>;

export const OneTrustGetListOfAssessmentsResponse = t.partial({
  /** The list of assessments in the current page. */
  content: t.array(OneTrustAssessment),
  /** Details about the pages being fetched */
  page: t.type({
    /** Page number of the results list (0…N). */
    number: t.number,
    /** Number of records per page (0…N). */
    size: t.number,
    /** Total number of elements. */
    totalElements: t.number,
    /** Total number of pages. */
    totalPages: t.number,
  }),
});

/** Type override */
export type OneTrustGetListOfAssessmentsResponse = t.TypeOf<
  typeof OneTrustGetListOfAssessmentsResponse
>;
