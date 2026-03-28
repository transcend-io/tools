/** AssessmentForm status types */
import { makeEnum } from '@transcend-io/type-utils';

/**
 * AssessmentForm status types
 */
export enum AssessmentFormStatus {
  /** The form has been created but has not been shared with assignees */
  Draft = 'DRAFT',
  /** The form has been created from a template and shared to be filled out */
  Shared = 'SHARED',
  /** The form is in process of being answered */
  InProgress = 'IN_PROGRESS',
  /** The form has been fully answered and is being reviewed */
  InReview = 'IN_REVIEW',
  /** The reviewers requested changes to the answers */
  ChangesRequested = 'CHANGES_REQUESTED',
  /** The reviewers rejected the answers */
  Rejected = 'REJECTED',
  /** The reviewers approved the answers */
  Approved = 'APPROVED',
}

/** AssessmentFormTemplate status types */
export enum AssessmentFormTemplateStatus {
  /** The template is being created */
  Draft = 'DRAFT',
  /** The template is ready to be used to create forms */
  Published = 'PUBLISHED',
}

/** How an assessment form template was created */
export const AssessmentFormTemplateSource = makeEnum({
  /** The template was created manually by a user creating sections, questions, etc in the AD or via API  */
  Manual: 'MANUAL',
  /** The template was auto-generated as a side effect of kicking off assessments from the Data Inventory */
  DataInventory: 'DATA_INVENTORY',
  /** The template was auto-generated as a side effect of importing OneTrust assessments */
  Import: 'IMPORT',
});

/**
 * Overload type
 */
export type AssessmentFormTemplateSource =
  (typeof AssessmentFormTemplateSource)[keyof typeof AssessmentFormTemplateSource];

/** The types of the assessment question */
export const AssessmentQuestionType = makeEnum({
  /** A long-answer text question */
  LongAnswer: 'LONG_ANSWER_TEXT',
  /** A short-answer text question */
  ShortAnswer: 'SHORT_ANSWER_TEXT',
  /** A single-select question */
  SingleSelect: 'SINGLE_SELECT',
  /** A multi-select question */
  MultiSelect: 'MULTI_SELECT',
  /** A file question */
  File: 'FILE',
  /** A static text field that has no answer field */
  Description: 'DESCRIPTION',
});

/**
 * Overload type
 */
export type AssessmentQuestionType =
  (typeof AssessmentQuestionType)[keyof typeof AssessmentQuestionType];

/**
 * The sub-types of the assessment question
 * TODO: https://transcend.height.app/T-36999 - migrate keys to equal values, just like
 *       StaticAssessmentQuestionSubType and DynamicAssessmentQuestionSubType
 */
export const AssessmentQuestionSubType = makeEnum({
  /** A None subType for types that do not accept subTypes */
  None: 'NONE',
  /** A Custom subType for user-defined select types */
  Custom: 'CUSTOM',
  /** A user */
  User: 'USER',
  /** A team */
  Team: 'TEAM',
  /** A Data SubCategory */
  DataSubCategory: 'DATA_SUB_CATEGORY',
  /** A Processing Purpose SubCategory */
  ProcessingPurposeSubCategory: 'PROCESSING_PURPOSE_SUB_CATEGORY',
  /** A Processing Activity */
  ProcessingActivity: 'PROCESSING_ACTIVITY',
  /** A vendor */
  Vendor: 'VENDOR',
  /** A Region question */
  Region: 'REGION',
  /** A Business Entity */
  BusinessEntity: 'BUSINESS_ENTITY',
  /** The category of the recipient */
  SaaSCategory: 'SAA_S_CATEGORY',
  /** The Data Processing Agreement Status */
  DataProcessingAgreementStatus: 'DATA_PROCESSING_AGREEMENT_STATUS',
  /** The Data Protection Impact Assessment Status */
  DataProtectionImpactAssessmentStatus: 'DATA_PROTECTION_IMPACT_ASSESSMENT_STATUS',
  /** The deprecation state */
  DeprecationState: 'DEPRECATION_STATE',
  /** The identifier */
  Identifier: 'IDENTIFIER',
  /** A Data Silo */
  DataSilo: 'DATA_SILO',
  /** Whether the data silo is recommended for consent manager purposes */
  RecommendedForConsent: 'RECOMMENDED_FOR_CONSENT',
  /** Whether the data silo is recommended for privacy request purposes */
  RecommendedForPrivacy: 'RECOMMENDED_FOR_PRIVACY',
  /** The subject */
  Subject: 'SUBJECT',
  /** The type of retention schedule */
  RetentionType: 'RETENTION_TYPE',
  /** The controllership */
  Controllership: 'CONTROLLERSHIP',
  /** Whether the data silo has personal data */
  HasPersonalData: 'HAS_PERSONAL_DATA',
  /** The Attribute Key referring to a custom field */
  AttributeKey: 'ATTRIBUTE_KEY',
  /** A sensitive category */
  SensitiveCategory: 'SENSITIVE_CATEGORY',
});

/**
 * Overload type
 */
export type AssessmentQuestionSubType =
  (typeof AssessmentQuestionSubType)[keyof typeof AssessmentQuestionSubType];

/** The possible actions within an assessment question's display logic */
export const AssessmentsDisplayLogicAction = makeEnum({
  /** Display the question */
  Show: 'SHOW',
  /** Skip the question */
  Skip: 'SKIP',
});

/**
 * Overload type
 */
export type AssessmentsDisplayLogicAction =
  (typeof AssessmentsDisplayLogicAction)[keyof typeof AssessmentsDisplayLogicAction];

/** The comparison operators to use in an assessment question's display logic  */
export const ComparisonOperator = makeEnum({
  /** is equal to */
  IsEqualTo: 'IS_EQUAL_TO',
  /** is not equal to */
  IsNotEqualTo: 'IS_NOT_EQUAL_TO',
  /** is one of */
  IsOneOf: 'IS_ONE_OF',
  /** is not one of */
  IsNotOneOf: 'IS_NOT_ONE_OF',
  /** contains */
  Contains: 'CONTAINS',
  /** is shown */
  IsShown: 'IS_SHOWN',
  /** is not shown */
  IsNotShown: 'IS_NOT_SHOWN',
});

/**
 * Overload type
 */
export type ComparisonOperator = (typeof ComparisonOperator)[keyof typeof ComparisonOperator];

/** The logic operators to use in an assessment question's display logic  */
export const LogicOperator = makeEnum({
  /** and */
  And: 'AND',
  /** or */
  Or: 'OR',
});

/**
 * Overload type
 */
export type LogicOperator = (typeof LogicOperator)[keyof typeof LogicOperator];

/**
 * types of data to be managed by the data retention policy
 */
export enum RetentionScheduleType {
  REQUESTS_CREATED_AT = 'REQUESTS_CREATED_AT',
  ASSESSMENT_FORM_COMPLETED_AT = 'ASSESSMENT_FORM_COMPLETED_AT',
}

/**
 * operation types for the data retention policy
 * FULL_DELETE: delete full record
 * PARTIAL_DELETE: delete identifiers only
 * NONE: don't do anything to the data
 */
export enum RetentionScheduleOperation {
  FULL_DELETE = 'FULL_DELETE',
  PARTIAL_DELETE = 'PARTIAL_DELETE',
  NONE = 'NONE',
}
