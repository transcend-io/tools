/* eslint-disable max-lines */
import * as t from 'io-ts';

/**
 * reference: https://developer.onetrust.com/onetrust/reference/exportassessmentusingget
 * Return types of the "Get Assessments" endpoint
 */
export const OneTrustApprover = t.type({
  /** ID of the user assigned as an approver. */
  id: t.string,
  /** ID of the workflow stage */
  workflowStageId: t.string,
  /** Name of the user assigned as an approver. */
  name: t.string,
  /** More details about the approver */
  approver: t.type({
    /** ID of the user assigned as an approver. */
    id: t.string,
    /** Full name of the user assigned as an approver. */
    fullName: t.string,
    /** Email of the user assigned as an approver. */
    email: t.union([t.string, t.null]),
    /** Whether the user assigned as an approver was deleted. */
    deleted: t.boolean,
    /** The assignee type */
    assigneeType: t.union([t.string, t.null]),
  }),
  /** Assessment approval status. */
  approvalState: t.union([t.literal('OPEN'), t.literal('APPROVED'), t.literal('REJECTED')]),
  /** Date and time at which the assessment was approved. */
  approvedOn: t.union([t.string, t.null]),
  /** ID of the assessment result. */
  resultId: t.union([t.string, t.null]),
  /** Name of the assessment result. */
  resultName: t.union([
    t.literal('Approved - Remediation required'),
    t.literal('Approved'),
    t.literal('Rejected'),
    t.literal('Assessment suspended - On Hold'),
    t.string,
    t.null,
  ]),
  /** Name key of the assessment result. */
  resultNameKey: t.union([t.string, t.null]),
});

/** Type override */
export type OneTrustApprover = t.TypeOf<typeof OneTrustApprover>;

export const OneTrustAssessmentStatus = t.union([
  t.literal('NOT_STARTED'),
  t.literal('IN_PROGRESS'),
  t.literal('UNDER_REVIEW'),
  t.literal('COMPLETED'),
]);
/** Type override */
export type OneTrustAssessmentStatus = t.TypeOf<typeof OneTrustAssessmentStatus>;

export const OneTrustPrimaryEntityDetails = t.array(
  t.type({
    /** Unique ID for the primary record. */
    id: t.string,
    /** Name of the primary record. */
    name: t.string,
    /** The number associated with the primary record. */
    number: t.number,
    /** Name and number of the primary record. */
    displayName: t.string,
    /** The relationshipResponseDetails */
    relationshipResponseDetails: t.union([t.string, t.null]),
    /** The entity business key */
    entityBusinessKey: t.union([t.string, t.null]),
  }),
);
/** Type override */
export type OneTrustPrimaryEntityDetails = t.TypeOf<typeof OneTrustPrimaryEntityDetails>;

export const OneTrustAssessmentSectionSubmittedBy = t.union([
  t.intersection([
    t.type({
      /** The ID of the user who submitted the section */
      id: t.string,
      /** THe name or email of the user who submitted the section */
      name: t.string,
    }),
    t.partial({
      /** The name key of the user who submitted the section */
      nameKey: t.union([t.string, t.null]),
    }),
  ]),
  t.null,
]);

/** Type override */
export type OneTrustAssessmentSectionSubmittedBy = t.TypeOf<
  typeof OneTrustAssessmentSectionSubmittedBy
>;

export const OneTrustAssessmentQuestionOption = t.intersection([
  t.partial({
    /** The translationIdentifier */
    translationIdentifier: t.string,
  }),
  t.type({
    /** ID of the option. */
    id: t.string,
    /** Name of the option. */
    option: t.string,
    /** The key of the option */
    optionKey: t.union([t.string, t.null]),
    /** The hint */
    hint: t.union([t.string, t.null]),
    /** The hint key */
    hintKey: t.union([t.string, t.null]),
    /** The score */
    score: t.union([t.number, t.null]),
    /** If the option was pre-selected */
    preSelectedOption: t.boolean,
    /** Order in which the option appears. */
    sequence: t.union([t.number, t.null]),
    /** Attribute for which the option is available. */
    attributes: t.union([t.string, t.null]),
    /** Type of option. */
    optionType: t.union([
      t.literal('NOT_SURE'),
      t.literal('NOT_APPLICABLE'),
      t.literal('OTHERS'),
      t.literal('DEFAULT'),
    ]),
  }),
]);

/** Type override */
export type OneTrustAssessmentQuestionOption = t.TypeOf<typeof OneTrustAssessmentQuestionOption>;

export const OneTrustAssessmentNestedQuestion = t.type({
  /** ID of the question. */
  id: t.string,
  /** ID of the root version of the question. */
  rootVersionId: t.string,
  /** Order in which the question appears in the assessment. */
  sequence: t.number,
  /** Type of question in the assessment. */
  questionType: t.union([t.string, t.null]),
  /** Indicates whether a response to the question is required. */
  required: t.boolean,
  /** Data element attributes that are directly updated by the question. */
  attributes: t.string,
  /** Short, descriptive name for the question. */
  friendlyName: t.union([t.string, t.null]),
  /** Description of the question. */
  description: t.union([t.string, t.null]),
  /** Tooltip text within a hint for the question. */
  hint: t.union([t.string, t.null]),
  /** ID of the parent question. */
  parentQuestionId: t.union([t.string, t.null]),
  /** Indicates whether the response to the question is prepopulated. */
  prePopulateResponse: t.boolean,
  /** Indicates whether the assessment is linked to inventory records. */
  linkAssessmentToInventory: t.boolean,
  /** The question options */
  options: t.union([t.array(OneTrustAssessmentQuestionOption), t.null]),
  /** Indicates whether the question is valid. */
  valid: t.boolean,
  /** Type of question in the assessment. */
  type: t.union([t.string, t.null]),
  /** Whether the response can be multi select */
  allowMultiSelect: t.boolean,
  /** The text of a question. */
  content: t.string,
  /** Indicates whether justification comments are required for the question. */
  requireJustification: t.boolean,
  /** The attachmentRequired */
  attachmentRequired: t.boolean,
});

/** Type override */
export type OneTrustAssessmentNestedQuestion = t.TypeOf<typeof OneTrustAssessmentNestedQuestion>;

export const OneTrustAssessmentResponses = t.array(
  t.intersection([
    t.partial({
      /** The response maturityScale */
      maturityScale: t.union([t.string, t.null]),
      /** The response effectivenessScale */
      effectivenessScale: t.union([t.string, t.null]),
      /** The response parentAssessmentDetailId */
      parentAssessmentDetailId: t.union([t.string, t.null]),
      /** The response display label */
      displayLabel: t.string,
      /** The response type of the parent question */
      parentQuestionType: t.string,
      /** The response ID of the parent response */
      parentResponseId: t.string,
      /** Whether it's local version */
      isLocalVersion: t.string,
      /** Whether relationshipDisplayInformation */
      relationshipDisplayInformation: t.union([t.string, t.null]),
      /** The response lock reason */
      lockReason: t.union([t.string, t.null]),
    }),
    t.type({
      /** The controlResponse */
      controlResponse: t.union([t.string, t.object, t.null]),
      /** The relationshipResponseDetails */
      relationshipResponseDetails: t.array(t.string),
      /** The textRedacted */
      textRedacted: t.boolean,
      /** The responseMap */
      responseMap: t.object,
      /** ID of the response. */
      responseId: t.string,
      /** Content of the response. */
      response: t.union([t.string, t.null]),
      /** The response key */
      responseKey: t.union([t.string, t.null]),
      /** The response key */
      contractResponse: t.union([t.string, t.null]),
      /** Type of response. */
      type: t.union([
        t.literal('NOT_SURE'),
        t.literal('JUSTIFICATION'),
        t.literal('NOT_APPLICABLE'),
        t.literal('DEFAULT'),
        t.literal('OTHERS'),
      ]),
      /** Source from which the assessment is launched. */
      responseSourceType: t.union([t.string, t.null]),
      /** Error associated with the response. */
      errorCode: t.union([
        t.literal('ATTRIBUTE_DISABLED'),
        t.literal('ATTRIBUTE_OPTION_DISABLED'),
        t.literal('INVENTORY_NOT_EXISTS'),
        t.literal('RELATED_INVENTORY_ATTRIBUTE_DISABLED'),
        t.literal('DATA_ELEMENT_NOT_EXISTS'),
        t.literal('DUPLICATE_INVENTORY'),
        t.null,
      ]),
      /** Indicates whether the response is valid. */
      valid: t.boolean,
      /** The data subject */
      dataSubject: t.union([
        t.type({
          /** The ID of the data subject */
          id: t.union([t.string, t.null]),
          /** The ID of the data subject */
          name: t.union([t.string, t.null]),
          /** The nameKey of the data category */
          nameKey: t.union([t.string, t.null]),
        }),
        t.null,
      ]),
      /** The data category */
      dataCategory: t.union([
        t.type({
          /** The ID of the data category */
          id: t.union([t.string, t.null]),
          /** The name of the data category */
          name: t.union([t.string, t.null]),
          /** The nameKey of the data category */
          nameKey: t.union([t.string, t.null]),
        }),
        t.null,
      ]),
      /** The data element */
      dataElement: t.union([
        t.type({
          /** The ID of the data element */
          id: t.union([t.string, t.null]),
          /** The name of the data element */
          name: t.union([t.string, t.null]),
          /** The name key of the data element */
          nameKey: t.union([t.string, t.null]),
        }),
        t.null,
      ]),
    }),
  ]),
);

/** Type override */
export type OneTrustAssessmentResponses = t.TypeOf<typeof OneTrustAssessmentResponses>;

export const OneTrustAssessmentQuestionResponses = t.array(
  t.type({
    /** The responses */
    responses: OneTrustAssessmentResponses,
    /** Justification comments for the given response. */
    justification: t.union([t.string, t.null]),
  }),
);

/** Type override */
export type OneTrustAssessmentQuestionResponses = t.TypeOf<
  typeof OneTrustAssessmentQuestionResponses
>;

export const OneTrustAssessmentQuestionRisk = t.intersection([
  t.type({
    /** ID of the question for which the risk was flagged. */
    questionId: t.string,
    /** ID of the flagged risk. */
    riskId: t.string,
  }),
  t.partial({
    /** Level of risk flagged on the question. */
    level: t.union([t.number, t.null]),
    /** Score of risk flagged on the question. */
    score: t.union([t.number, t.null]),
    /** Probability of risk flagged on the question. */
    probability: t.union([t.number, t.undefined]),
    /** Impact Level of risk flagged on the question. */
    impactLevel: t.union([t.number, t.undefined]),
  }),
]);

/** Type override */
export type OneTrustAssessmentQuestionRisk = t.TypeOf<typeof OneTrustAssessmentQuestionRisk>;

export const OneTrustAssessmentQuestion = t.intersection([
  t.type({
    /** The question */
    question: OneTrustAssessmentNestedQuestion,
    /** Indicates whether the question is hidden on the assessment. */
    hidden: t.boolean,
    /** Reason for locking the question in the assessment. */
    lockReason: t.union([t.string, t.null]),
    /** The copy errors */
    copyErrors: t.union([t.string, t.null]),
    /** Indicates whether navigation rules are enabled for the question. */
    hasNavigationRules: t.boolean,
    /** The responses to this question */
    questionResponses: OneTrustAssessmentQuestionResponses,
    /** The risks associated with this question */
    risks: t.union([t.array(OneTrustAssessmentQuestionRisk), t.null]),
    /** List of IDs associated with the question root requests. */
    rootRequestInformationIds: t.array(t.string),
    /** Number of attachments added to the question. */
    totalAttachments: t.number,
    /** IDs of the attachment(s) added to the question. */
    attachmentIds: t.array(t.string),
    /** The canReopenWithAllowEditOption */
    canReopenWithAllowEditOption: t.boolean,
    /** The riskCreationAllowed */
    riskCreationAllowed: t.boolean,
    /** The riskDeletionPopupAllowed */
    riskDeletionPopupAllowed: t.boolean,
    /** The allowMaturityScaleOnQuestions */
    allowMaturityScaleOnQuestions: t.boolean,
    /** The questionAssociations */
    questionAssociations: t.union([t.string, t.null]),
    /** The issues */
    issues: t.union([t.string, t.null]),
    /** The responseEditableWhileUnderReview */
    responseEditableWhileUnderReview: t.boolean,
  }),
  t.partial({
    /** The businessKeyReference */
    businessKeyReference: t.union([t.string, t.null]),
    /** The topic */
    topic: t.union([t.string, t.null]),
    /** The questionLaws */
    questionLaws: t.array(t.string),
    /** The responseFilter */
    responseFilter: t.union([t.string, t.null]),
    /** The linkAssessmentToResponseEntity */
    linkAssessmentToResponseEntity: t.boolean,
    /** The translationIdentifier */
    translationIdentifier: t.string,
    /** The readOnly */
    readOnly: t.boolean,
    /** The schema */
    schema: t.union([t.string, t.null]),
    /** The attributeId */
    attributeId: t.string,
    /** Whether it is a vendor question */
    vendorQuestion: t.boolean,
    /** Whether the question was seeded */
    seeded: t.boolean,
    /** Whether the question allows justification */
    allowJustification: t.boolean,
    /** Whether it refers to an asset question */
    assetQuestion: t.boolean,
    /** Whether it refers to an entity question */
    entityQuestion: t.boolean,
    /** Whether it is a paquestion */
    paquestion: t.boolean,
    /** The inventoryTypeEnum */
    inventoryTypeEnum: t.union([t.string, t.null]),
    /** Whether it is a forceOther */
    forceOther: t.boolean,
    /** Whether it is a isParentQuestionMultiSelect */
    isParentQuestionMultiSelect: t.boolean,
  }),
]);

/** Type override */
export type OneTrustAssessmentQuestion = t.TypeOf<typeof OneTrustAssessmentQuestion>;

export const OneTrustAssessmentSectionHeaderRiskStatistics = t.union([
  t.type({
    /** Maximum level of risk in the section. */
    maxRiskLevel: t.union([t.number, t.null]),
    /** Number of risks in the section. */
    riskCount: t.union([t.number, t.null]),
    /** ID of the section in the assessment. */
    sectionId: t.union([t.string, t.null]),
  }),
  t.null,
]);

/** Type override */
export type OneTrustAssessmentSectionHeaderRiskStatistics = t.TypeOf<
  typeof OneTrustAssessmentSectionHeaderRiskStatistics
>;

export const OneTrustAssessmentSectionHeader = t.intersection([
  t.type({
    /** ID of the section in the assessment. */
    sectionId: t.string,
    /** Name of the section. */
    name: t.string,
    /** The status of the section */
    status: t.union([t.string, t.null]),
    /** The openNMIQuestionIds */
    openNMIQuestionIds: t.union([t.string, t.null]),
    /** Description of the section header. */
    description: t.union([t.string, t.null]),
    /** Sequence of the section within the form */
    sequence: t.number,
    /** Indicates whether the section is hidden in the assessment. */
    hidden: t.boolean,
    /** IDs of invalid questions in the section. */
    invalidQuestionIds: t.array(t.string),
    /** IDs of required but unanswered questions in the section. */
    requiredUnansweredQuestionIds: t.array(t.string),
    /** IDs of required questions in the section. */
    requiredQuestionIds: t.array(t.string),
    /** IDs of unanswered questions in the section. */
    unansweredQuestionIds: t.array(t.string),
    /** IDs of effectiveness questions in the section. */
    effectivenessQuestionIds: t.array(t.string),
    /** The risk statistics */
    riskStatistics: OneTrustAssessmentSectionHeaderRiskStatistics,
    /** Whether the section was submitted */
    submitted: t.boolean,
  }),
  t.partial({
    /** The name key of the template */
    nameKey: t.union([t.string, t.null]),
  }),
]);

/** Type override */
export type OneTrustAssessmentSectionHeader = t.TypeOf<typeof OneTrustAssessmentSectionHeader>;

export const OneTrustAssessmentSection = t.type({
  /** The Assessment section header */
  header: OneTrustAssessmentSectionHeader,
  /** The questions within the section */
  questions: t.array(OneTrustAssessmentQuestion),
  /** Indicates whether navigation rules are enabled for the question. */
  hasNavigationRules: t.boolean,
  /** Who submitted the section */
  submittedBy: OneTrustAssessmentSectionSubmittedBy,
  /** Date of the submission */
  submittedDt: t.union([t.string, t.null]),
  /** Name of the section. */
  name: t.string,
  /** Indicates whether navigation rules are enabled for the question. */
  hidden: t.boolean,
  /** Indicates whether the section is valid. */
  valid: t.boolean,
  /** ID of the section in an assessment. */
  sectionId: t.string,
  /** Sequence of the section within the form */
  sequence: t.number,
  /** Whether the section was submitted */
  submitted: t.boolean,
  /** Descriptions of the section. */
  description: t.union([t.string, t.null]),
});

/** Type override */
export type OneTrustAssessmentSection = t.TypeOf<typeof OneTrustAssessmentSection>;

export const OneTrustAssessmentCreatedBy = t.type({
  /** The ID of the creator */
  id: t.string,
  /** The name of the creator */
  name: t.string,
  /** The name key of the template */
  nameKey: t.union([t.string, t.null]),
});

/** Type override */
export type OneTrustAssessmentCreatedBy = t.TypeOf<typeof OneTrustAssessmentCreatedBy>;

// ref: https://developer.onetrust.com/onetrust/reference/exportassessmentusingget
export const OneTrustGetAssessmentResponse = t.type({
  /** List of users assigned as approvers of the assessment. */
  approvers: t.array(OneTrustApprover),
  /** ID of an assessment. */
  assessmentId: t.string,
  /** Number assigned to an assessment. */
  assessmentNumber: t.number,
  /** Date and time at which the assessment was completed. */
  completedOn: t.union([t.string, t.null]),
  /** Status of the assessment. */
  status: OneTrustAssessmentStatus,
  /** Creator of the Assessment */
  createdBy: OneTrustAssessmentCreatedBy,
  /** Date and time at which the assessment was created. */
  createdDT: t.string,
  /** Date and time by which the assessment must be completed. */
  deadline: t.union([t.string, t.null]),
  /** Description of the assessment. */
  description: t.union([t.string, t.null]),
  /** Overall inherent risk score without considering the existing controls. */
  inherentRiskScore: t.union([t.number, t.null]),
  /** Date and time at which the assessment was last updated. */
  lastUpdated: t.string,
  /** Number of risks captured on the assessment with a low risk level. */
  lowRisk: t.number,
  /** Number of risks captured on the assessment with a medium risk level. */
  mediumRisk: t.number,
  /** Number of risks captured on the assessment with a high risk level. */
  highRisk: t.number,
  /** Name of the assessment. */
  name: t.string,
  /** Number of open risks that have not been addressed. */
  openRiskCount: t.number,
  /** The organization group */
  orgGroup: t.intersection([
    t.type({
      /** The ID of the organization group */
      id: t.string,
      /** The name of the organization group */
      name: t.string,
    }),
    t.partial({
      /** The name key of the template */
      nameKey: t.union([t.string, t.null]),
    }),
  ]),
  /** The primary record */
  primaryEntityDetails: OneTrustPrimaryEntityDetails,
  /** Type of inventory record designated as the primary record. */
  primaryRecordType: t.union([t.string, t.null]),
  /** Overall risk score after considering existing controls. */
  residualRiskScore: t.union([t.number, t.null]),
  /** The respondent */
  respondent: t.type({
    /** The ID of the respondent */
    id: t.string,
    /** The name or email of the respondent */
    name: t.string,
  }),
  /** The respondents */
  respondents: t.array(
    t.type({
      /** The ID of the respondent */
      id: t.string,
      /** The name or email of the respondent */
      name: t.string,
      /** The name key of the template */
      nameKey: t.union([t.string, t.null]),
    }),
  ),
  /** Result of the assessment. */
  result: t.union([t.string, t.null]),
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
  /** Risk level of the assessment. */
  riskLevel: t.union([
    t.literal('None'),
    t.literal('Low'),
    t.literal('Medium'),
    t.literal('High'),
    t.literal('Very High'),
  ]),
  /** List of sections in the assessment. */
  sections: t.array(OneTrustAssessmentSection),
  /** Date and time at which the assessment was submitted. */
  submittedOn: t.union([t.string, t.null]),
  /** List of tags associated with the assessment. */
  tags: t.array(t.string),
  /** The desired target risk score. */
  targetRiskScore: t.union([t.number, t.null]),
  /** The template */
  template: t.type({
    /** The ID of the template */
    id: t.string,
    /** The name of the template */
    name: t.string,
    /** The name key of the template */
    nameKey: t.union([t.string, t.null]),
  }),
  /** Number of total risks on the assessment. */
  totalRiskCount: t.number,
  /** Number of very high risks on the assessment. */
  veryHighRisk: t.number,
  /** Welcome text if any in the assessment. */
  welcomeText: t.union([t.string, t.null]),
});

/** Type override */
export type OneTrustGetAssessmentResponse = t.TypeOf<typeof OneTrustGetAssessmentResponse>;

/* eslint-enable max-lines */
