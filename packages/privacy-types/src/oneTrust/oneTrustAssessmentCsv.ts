/* eslint-disable max-lines */
import * as t from 'io-ts';

/**
 * The header fields of the OneTrust assessment csv file exported via the Transcend CLI.
 * These are built off the values returned by the OneTrust APIs.
 */
export enum OneTrustAssessmentCsvHeader {
  /** ID of an assessment. */
  AssessmentId = 'assessmentId',
  /** Date that the assessment was created. */
  CreateDt = 'createDt',
  /** Overall risk score without considering existing controls. */
  InherentRiskScore = 'inherentRiskScore',
  /** Date and time that the assessment was last updated. */
  LastUpdated = 'lastUpdated',
  /** Name of the assessment. */
  Name = 'name',
  /** Number assigned to the assessment. */
  Number = 'number',
  /** Number of risks that are open on the assessment. */
  OpenRiskCount = 'openRiskCount',
  /** Name of the organization group assigned to the assessment. */
  OrgGroupName = 'orgGroupName',
  /** GUID of the inventory record which is the primary record of the assessment. */
  PrimaryInventoryDetails_PrimaryInventoryId = 'primaryInventoryDetails_primaryInventoryId',
  /** Name of the inventory record. */
  PrimaryInventoryDetails_PrimaryInventoryName = 'primaryInventoryDetails_primaryInventoryName',
  /** Integer ID of the inventory record. */
  PrimaryInventoryDetails_PrimaryInventoryNumber = 'primaryInventoryDetails_primaryInventoryNumber',
  /** Overall risk score after considering existing controls. */
  ResidualRiskScore = 'residualRiskScore',
  /** Result of the assessment. NOTE: This field will be deprecated soon. Please reference the 'resultName' field instead. */
  Result = 'result',
  /** ID of the result. */
  ResultId = 'resultId',
  /** Name of the result. */
  ResultName = 'resultName',
  /** State of the assessment. */
  State = 'state',
  /** Name of the tag attached to the assessment. */
  Tags = 'tags',
  /** The desired risk score. */
  TargetRiskScore = 'targetRiskScore',
  /** ID used to launch an assessment using a specific version of a template. */
  TemplateId = 'templateId',
  /**  Name of the template that is being used on the assessment. */
  TemplateName = 'templateName',
  /** ID used to launch an assessment using the latest published version of a template. */
  TemplateRootVersionId = 'templateRootVersionId',
  /** Number assigned to an assessment. */
  AssessmentNumber = 'assessmentNumber',
  /** Date and time at which the assessment was completed. */
  CompletedOn = 'completedOn',
  /** Status of the assessment. */
  Status = 'status',
  /** The ID of the creator */
  CreatedBy_Id = 'createdBy_id',
  /** The name of the creator */
  CreatedBy_Name = 'createdBy_name',
  /** The name key of the template */
  CreatedBy_NameKey = 'createdBy_nameKey',
  /** Date and time at which the assessment was created. */
  CreatedDT = 'createdDT',
  /** Date and time by which the assessment must be completed. */
  Deadline = 'deadline',
  /** Description of the assessment. */
  Description = 'description',
  /** Number of risks captured on the assessment with a low risk level. */
  LowRisk = 'lowRisk',
  /** Number of risks captured on the assessment with a medium risk level. */
  MediumRisk = 'mediumRisk',
  /** Number of risks captured on the assessment with a high risk level. */
  HighRisk = 'highRisk',
  /** The ID of the organization group */
  OrgGroup_Id = 'orgGroup_id',
  /** The name of the organization group */
  OrgGroup_Name = 'orgGroup_name',
  /** The name key of the template */
  OrgGroup_NameKey = 'orgGroup_nameKey',
  /** Type of inventory record designated as the primary record. */
  PrimaryRecordType = 'primaryRecordType',
  /** Risk level of the assessment. */
  RiskLevel = 'riskLevel',
  /** Date and time at which the assessment was submitted. */
  SubmittedOn = 'submittedOn',
  /** The ID of the template */
  Template_Id = 'template_id',
  /** The name of the template */
  Template_Name = 'template_name',
  /** The name key of the template */
  Template_NameKey = 'template_nameKey',
  /** Number of total risks on the assessment. */
  TotalRiskCount = 'totalRiskCount',
  /** Number of very high risks on the assessment. */
  VeryHighRisk = 'veryHighRisk',
  /** Welcome text if any in the assessment. */
  WelcomeText = 'welcomeText',
  /** ID of the user assigned as an approver. */
  Approvers_Id = 'approvers_id',
  /** ID of the workflow stage */
  Approvers_WorkflowStageId = 'approvers_workflowStageId',
  /** Name of the user assigned as an approver. */
  Approvers_Name = 'approvers_name',
  /** ID of the user assigned as an approver. */
  Approvers_Approver_Id = 'approvers_approver_id',
  /** Full name of the user assigned as an approver. */
  Approvers_Approver_FullName = 'approvers_approver_fullName',
  /** Email of the user assigned as an approver. */
  Approvers_Approver_Email = 'approvers_approver_email',
  /** Whether the user assigned as an approver was deleted. */
  Approvers_Approver_Deleted = 'approvers_approver_deleted',
  /** The assignee type */
  Approvers_Approver_AssigneeType = 'approvers_approver_assigneeType',
  /** Assessment approval status. */
  Approvers_ApprovalState = 'approvers_approvalState',
  /** Date and time at which the assessment was approved. */
  Approvers_ApprovedOn = 'approvers_approvedOn',
  /** ID of the assessment result. */
  Approvers_ResultId = 'approvers_resultId',
  /** Name of the assessment result. */
  Approvers_ResultName = 'approvers_resultName',
  /** Name key of the assessment result. */
  Approvers_ResultNameKey = 'approvers_resultNameKey',
  /** The ID of the respondent */
  Respondents_Id = 'respondents_id',
  /** The name or email of the respondent */
  Respondents_Name = 'respondents_name',
  /** The name key of the template */
  Respondents_NameKey = 'respondents_nameKey',
  /** Unique ID for the primary record. */
  PrimaryEntityDetails_Id = 'primaryEntityDetails_id',
  /** Name of the primary record. */
  PrimaryEntityDetails_Name = 'primaryEntityDetails_name',
  /** The number associated with the primary record. */
  PrimaryEntityDetails_Number = 'primaryEntityDetails_number',
  /** Name and number of the primary record. */
  PrimaryEntityDetails_DisplayName = 'primaryEntityDetails_displayName',
  /** The relationshipResponseDetails */
  PrimaryEntityDetails_RelationshipResponseDetails = 'primaryEntityDetails_relationshipResponseDetails',
  /** The entity business key */
  PrimaryEntityDetails_EntityBusinessKey = 'primaryEntityDetails_entityBusinessKey',
  Sections_HasNavigationRules = 'sections_hasNavigationRules',
  Sections_SubmittedBy_Id = 'sections_submittedBy_id',
  Sections_SubmittedBy_Name = 'sections_submittedBy_name',
  Sections_SubmittedBy_NameKey = 'sections_submittedBy_nameKey',
  Sections_SubmittedDt = 'sections_submittedDt',
  /** Name of the section. */
  Sections_Name = 'sections_name',
  /** Indicates whether the section is hidden in the assessment. */
  Sections_Hidden = 'sections_hidden',
  Sections_Valid = 'sections_valid',
  /** ID of the section in the assessment. */
  Sections_SectionId = 'sections_sectionId',
  /** Sequence of the section within the form */
  Sections_Sequence = 'sections_sequence',
  Sections_Submitted = 'sections_submitted',
  /** Description of the section header. */
  Sections_Description = 'sections_description',
  /** The status of the section */
  Sections_Status = 'sections_status',
  /** The openNMIQuestionIds */
  Sections_OpenNMIQuestionIds = 'sections_openNMIQuestionIds',
  /** IDs of invalid questions in the section. */
  Sections_InvalidQuestionIds = 'sections_invalidQuestionIds',
  /** IDs of required but unanswered questions in the section. */
  Sections_RequiredUnansweredQuestionIds = 'sections_requiredUnansweredQuestionIds',
  /** IDs of required questions in the section. */
  Sections_RequiredQuestionIds = 'sections_requiredQuestionIds',
  /** IDs of unanswered questions in the section. */
  Sections_UnansweredQuestionIds = 'sections_unansweredQuestionIds',
  /** IDs of effectiveness questions in the section. */
  Sections_EffectivenessQuestionIds = 'sections_effectivenessQuestionIds',
  /** The name key of the template */
  Sections_NameKey = 'sections_nameKey',
  /** Maximum level of risk in the section. */
  Sections_RiskStatistics_MaxRiskLevel = 'sections_riskStatistics_maxRiskLevel',
  /** Number of risks in the section. */
  Sections_RiskStatistics_RiskCount = 'sections_riskStatistics_riskCount',
  /** ID of the section in the assessment. */
  Sections_RiskStatistics_SectionId = 'sections_riskStatistics_sectionId',
  /** Indicates whether the question is hidden on the assessment. */
  Sections_Questions_Hidden = 'sections_questions_hidden',
  /** Reason for locking the question in the assessment. */
  Sections_Questions_LockReason = 'sections_questions_lockReason',
  /** The copy errors */
  Sections_Questions_CopyErrors = 'sections_questions_copyErrors',
  /** Indicates whether navigation rules are enabled for the question. */
  Sections_Questions_HasNavigationRules = 'sections_questions_hasNavigationRules',
  /** List of IDs associated with the question root requests. */
  Sections_Questions_RootRequestInformationIds = 'sections_questions_rootRequestInformationIds',
  /** Number of attachments added to the question. */
  Sections_Questions_TotalAttachments = 'sections_questions_totalAttachments',
  /** IDs of the attachment(s) added to the question. */
  Sections_Questions_AttachmentIds = 'sections_questions_attachmentIds',
  /** The canReopenWithAllowEditOption */
  Sections_Questions_CanReopenWithAllowEditOption = 'sections_questions_canReopenWithAllowEditOption',
  /** The riskCreationAllowed */
  Sections_Questions_RiskCreationAllowed = 'sections_questions_riskCreationAllowed',
  /** The riskDeletionPopupAllowed */
  Sections_Questions_RiskDeletionPopupAllowed = 'sections_questions_riskDeletionPopupAllowed',
  /** The allowMaturityScaleOnQuestions */
  Sections_Questions_AllowMaturityScaleOnQuestions = 'sections_questions_allowMaturityScaleOnQuestions',
  /** The questionAssociations */
  Sections_Questions_QuestionAssociations = 'sections_questions_questionAssociations',
  /** The issues */
  Sections_Questions_Issues = 'sections_questions_issues',
  /** The responseEditableWhileUnderReview */
  Sections_Questions_ResponseEditableWhileUnderReview = 'sections_questions_responseEditableWhileUnderReview',
  /** The businessKeyReference */
  Sections_Questions_BusinessKeyReference = 'sections_questions_businessKeyReference',
  /** The topic */
  Sections_Questions_Topic = 'sections_questions_topic',
  /** The questionLaws */
  Sections_Questions_QuestionLaws = 'sections_questions_questionLaws',
  /** The attachmentRequired */
  Sections_Questions_AttachmentRequired = 'sections_questions_attachmentRequired',
  /** The responseFilter */
  Sections_Questions_ResponseFilter = 'sections_questions_responseFilter',
  /** The linkAssessmentToResponseEntity */
  Sections_Questions_LinkAssessmentToResponseEntity = 'sections_questions_linkAssessmentToResponseEntity',
  /** The translationIdentifier */
  Sections_Questions_TranslationIdentifier = 'sections_questions_translationIdentifier',
  /** The readOnly */
  Sections_Questions_ReadOnly = 'sections_questions_readOnly',
  /** The schema */
  Sections_Questions_Schema = 'sections_questions_schema',
  /** The attributeId */
  Sections_Questions_AttributeId = 'sections_questions_attributeId',
  /** Whether it is a vendor question */
  Sections_Questions_VendorQuestion = 'sections_questions_vendorQuestion',
  /** Whether the question was seeded */
  Sections_Questions_Seeded = 'sections_questions_seeded',
  /** Whether the question allows justification */
  Sections_Questions_AllowJustification = 'sections_questions_allowJustification',
  /** Whether it refers to an asset question */
  Sections_Questions_AssetQuestion = 'sections_questions_assetQuestion',
  /** Whether it refers to an entity question */
  Sections_Questions_EntityQuestion = 'sections_questions_entityQuestion',
  /** Whether it is a paquestion */
  Sections_Questions_Paquestion = 'sections_questions_paquestion',
  /** The inventoryTypeEnum */
  Sections_Questions_InventoryTypeEnum = 'sections_questions_inventoryTypeEnum',
  /** Whether it is a forceOther */
  Sections_Questions_ForceOther = 'sections_questions_forceOther',
  /** Whether it is a isParentQuestionMultiSelect */
  Sections_Questions_IsParentQuestionMultiSelect = 'sections_questions_isParentQuestionMultiSelect',
  /** ID of the question. */
  Sections_Questions_Id = 'sections_questions_id',
  /** ID of the root version of the question. */
  Sections_Questions_RootVersionId = 'sections_questions_rootVersionId',
  /** Order in which the question appears in the assessment. */
  Sections_Questions_Sequence = 'sections_questions_sequence',
  /** Type of question in the assessment. */
  Sections_Questions_QuestionType = 'sections_questions_questionType',
  /** Indicates whether a response to the question is required. */
  Sections_Questions_Required = 'sections_questions_required',
  /** Data element attributes that are directly updated by the question. */
  Sections_Questions_Attributes = 'sections_questions_attributes',
  /** Short, descriptive name for the question. */
  Sections_Questions_FriendlyName = 'sections_questions_friendlyName',
  /** Description of the question. */
  Sections_Questions_Description = 'sections_questions_description',
  /** Tooltip text within a hint for the question. */
  Sections_Questions_Hint = 'sections_questions_hint',
  /** ID of the parent question. */
  Sections_Questions_ParentQuestionId = 'sections_questions_parentQuestionId',
  /** Indicates whether the response to the question is prepopulated. */
  Sections_Questions_PrePopulateResponse = 'sections_questions_prePopulateResponse',
  /** Indicates whether the assessment is linked to inventory records. */
  Sections_Questions_LinkAssessmentToInventory = 'sections_questions_linkAssessmentToInventory',
  /** Indicates whether the question is valid. */
  Sections_Questions_Valid = 'sections_questions_valid',
  /** Type of question in the assessment. */
  Sections_Questions_Type = 'sections_questions_type',
  /** Whether the response can be multi select */
  Sections_Questions_AllowMultiSelect = 'sections_questions_allowMultiSelect',
  /** The text of a question. */
  Sections_Questions_Content = 'sections_questions_content',
  /** Indicates whether justification comments are required for the question. */
  Sections_Questions_RequireJustification = 'sections_questions_requireJustification',
  /** The translationIdentifier */
  Sections_Questions_Options_TranslationIdentifier = 'sections_questions_options_translationIdentifier',
  /** ID of the option. */
  Sections_Questions_Options_Id = 'sections_questions_options_id',
  /** Name of the option. */
  Sections_Questions_Options_Option = 'sections_questions_options_option',
  /** The key of the option */
  Sections_Questions_Options_OptionKey = 'sections_questions_options_optionKey',
  /** The hint */
  Sections_Questions_Options_Hint = 'sections_questions_options_hint',
  /** The hint key */
  Sections_Questions_Options_HintKey = 'sections_questions_options_hintKey',
  /** The score */
  Sections_Questions_Options_Score = 'sections_questions_options_score',
  /** If the option was pre-selected */
  Sections_Questions_Options_PreSelectedOption = 'sections_questions_options_preSelectedOption',
  /** Order in which the option appears. */
  Sections_Questions_Options_Sequence = 'sections_questions_options_sequence',
  /** Attribute for which the option is available. */
  Sections_Questions_Options_Attributes = 'sections_questions_options_attributes',
  /** Type of option. */
  Sections_Questions_Options_OptionType = 'sections_questions_options_optionType',
  /** ID of the question for which the risk was flagged. */
  Sections_Questions_Risks_QuestionId = 'sections_questions_risks_questionId',
  /** ID of the flagged risk. */
  Sections_Questions_Risks_RiskId = 'sections_questions_risks_riskId',
  /** Level of risk flagged on the question. */
  Sections_Questions_Risks_Level = 'sections_questions_risks_level',
  /** Score of risk flagged on the question. */
  Sections_Questions_Risks_Score = 'sections_questions_risks_score',
  /** Probability of risk flagged on the question. */
  Sections_Questions_Risks_Probability = 'sections_questions_risks_probability',
  /** Impact Level of risk flagged on the question. */
  Sections_Questions_Risks_ImpactLevel = 'sections_questions_risks_impactLevel',
  /** Risk description. */
  Sections_Questions_Risks_Description = 'sections_questions_risks_description',
  /** Short Name for a Risk. */
  Sections_Questions_Risks_Name = 'sections_questions_risks_name',
  /** Risk Treatment. */
  Sections_Questions_Risks_Treatment = 'sections_questions_risks_treatment',
  /** Risk Treatment status. */
  Sections_Questions_Risks_TreatmentStatus = 'sections_questions_risks_treatmentStatus',
  /** Risk Type. */
  Sections_Questions_Risks_Type = 'sections_questions_risks_type',
  /** The currentStageApprovers */
  Sections_Questions_Risks_Stage_CurrentStageApprovers = 'sections_questions_risks_stage_currentStageApprovers',
  /** The badgeColor */
  Sections_Questions_Risks_Stage_BadgeColor = 'sections_questions_risks_stage_badgeColor',
  Sections_Questions_Risks_Stage_Id = 'sections_questions_risks_stage_id',
  Sections_Questions_Risks_Stage_Name = 'sections_questions_risks_stage_name',
  Sections_Questions_Risks_Stage_NameKey = 'sections_questions_risks_stage_nameKey',
  /** The risk state */
  Sections_Questions_Risks_State = 'sections_questions_risks_state',
  /** Risk Result. */
  Sections_Questions_Risks_Result = 'sections_questions_risks_result',
  /** Whether the category was seeded */
  Sections_Questions_Risks_Categories_Seeded = 'sections_questions_risks_categories_seeded',
  /** Identifier for Risk Category. */
  Sections_Questions_Risks_Categories_Id = 'sections_questions_risks_categories_id',
  /** Risk Category Name. */
  Sections_Questions_Risks_Categories_Name = 'sections_questions_risks_categories_name',
  /** Risk Category Name Key value for translation. */
  Sections_Questions_Risks_Categories_NameKey = 'sections_questions_risks_categories_nameKey',
  /** The response maturityScale */
  Sections_Questions_QuestionResponses_MaturityScale = 'sections_questions_questionResponses_maturityScale',
  /** The response effectivenessScale */
  Sections_Questions_QuestionResponses_EffectivenessScale = 'sections_questions_questionResponses_effectivenessScale',
  /** The response parentAssessmentDetailId */
  // eslint-disable-next-line max-len
  Sections_Questions_QuestionResponses_ParentAssessmentDetailId = 'sections_questions_questionResponses_parentAssessmentDetailId',
  /** The response display label */

  Sections_Questions_QuestionResponses_DisplayLabel = 'sections_questions_questionResponses_displayLabel',
  /** The response type of the parent question */
  Sections_Questions_QuestionResponses_ParentQuestionType = 'sections_questions_questionResponses_parentQuestionType',
  /** The response ID of the parent response */
  Sections_Questions_QuestionResponses_ParentResponseId = 'sections_questions_questionResponses_parentResponseId',
  /** Whether it's local version */
  Sections_Questions_QuestionResponses_IsLocalVersion = 'sections_questions_questionResponses_isLocalVersion',
  /** Whether relationshipDisplayInformation */
  // eslint-disable-next-line max-len
  Sections_Questions_QuestionResponses_RelationshipDisplayInformation = 'sections_questions_questionResponses_relationshipDisplayInformation',
  /** The response lock reason */
  Sections_Questions_QuestionResponses_LockReason = 'sections_questions_questionResponses_lockReason',
  /** The controlResponse */
  Sections_Questions_QuestionResponses_ControlResponse = 'sections_questions_questionResponses_controlResponse',
  /** The relationshipResponseDetails */
  // eslint-disable-next-line max-len
  Sections_Questions_QuestionResponses_RelationshipResponseDetails = 'sections_questions_questionResponses_relationshipResponseDetails',
  /** The textRedacted */
  Sections_Questions_QuestionResponses_TextRedacted = 'sections_questions_questionResponses_textRedacted',
  /** The responseMap */
  Sections_Questions_QuestionResponses_ResponseMap = 'sections_questions_questionResponses_responseMap',
  /** ID of the response. */
  Sections_Questions_QuestionResponses_ResponseId = 'sections_questions_questionResponses_responseId',
  /** Content of the response. */
  Sections_Questions_QuestionResponses_Response = 'sections_questions_questionResponses_response',
  /** The response key */
  Sections_Questions_QuestionResponses_ResponseKey = 'sections_questions_questionResponses_responseKey',
  /** The response key */
  Sections_Questions_QuestionResponses_ContractResponse = 'sections_questions_questionResponses_contractResponse',
  /** Type of response. */
  Sections_Questions_QuestionResponses_Type = 'sections_questions_questionResponses_type',
  /** Source from which the assessment is launched. */
  Sections_Questions_QuestionResponses_ResponseSourceType = 'sections_questions_questionResponses_responseSourceType',
  /** Error associated with the response. */
  Sections_Questions_QuestionResponses_ErrorCode = 'sections_questions_questionResponses_errorCode',
  /** Indicates whether the response is valid. */
  Sections_Questions_QuestionResponses_Valid = 'sections_questions_questionResponses_valid',
  /** The ID of the data subject */
  Sections_Questions_QuestionResponses_DataSubject_Id = 'sections_questions_questionResponses_dataSubject_id',
  /** The ID of the data subject */
  Sections_Questions_QuestionResponses_DataSubject_Name = 'sections_questions_questionResponses_dataSubject_name',
  /** The nameKey of the data category */
  Sections_Questions_QuestionResponses_DataSubject_NameKey = 'sections_questions_questionResponses_dataSubject_nameKey',
  /** The ID of the data category */
  Sections_Questions_QuestionResponses_DataCategory_Id = 'sections_questions_questionResponses_dataCategory_id',
  /** The name of the data category */
  Sections_Questions_QuestionResponses_DataCategory_Name = 'sections_questions_questionResponses_dataCategory_name',
  /** The nameKey of the data category */
  Sections_Questions_QuestionResponses_DataCategory_NameKey = 'sections_questions_questionResponses_dataCategory_nameKey',
  /** The ID of the data element */
  Sections_Questions_QuestionResponses_DataElement_Id = 'sections_questions_questionResponses_dataElement_id',
  /** The name of the data element */
  Sections_Questions_QuestionResponses_DataElement_Name = 'sections_questions_questionResponses_dataElement_name',
  /** The name key of the data element */
  Sections_Questions_QuestionResponses_DataElement_NameKey = 'sections_questions_questionResponses_dataElement_nameKey',
  /** Justification comments for the given response. */
  Sections_Questions_QuestionResponses_Justification = 'sections_questions_questionResponses_justification',
}

/**
 * A map from OneTrustAssessmentCsvHeader to string. Useful for ensuring a
 * OneTrust Assessment record has all expected keys before converting to a CSV row.
 */
export const OneTrustAssessmentCsvRecord = t.record(
  /** The keys found in the OneTrust CSV header */
  t.keyof({
    [OneTrustAssessmentCsvHeader.AssessmentId]: null,
    [OneTrustAssessmentCsvHeader.CreateDt]: null,
    [OneTrustAssessmentCsvHeader.InherentRiskScore]: null,
    [OneTrustAssessmentCsvHeader.LastUpdated]: null,
    [OneTrustAssessmentCsvHeader.Name]: null,
    [OneTrustAssessmentCsvHeader.Number]: null,
    [OneTrustAssessmentCsvHeader.OpenRiskCount]: null,
    [OneTrustAssessmentCsvHeader.OrgGroupName]: null,
    [OneTrustAssessmentCsvHeader.PrimaryInventoryDetails_PrimaryInventoryId]: null,
    [OneTrustAssessmentCsvHeader.PrimaryInventoryDetails_PrimaryInventoryName]: null,
    [OneTrustAssessmentCsvHeader.PrimaryInventoryDetails_PrimaryInventoryNumber]: null,
    [OneTrustAssessmentCsvHeader.ResidualRiskScore]: null,
    [OneTrustAssessmentCsvHeader.Result]: null,
    [OneTrustAssessmentCsvHeader.ResultId]: null,
    [OneTrustAssessmentCsvHeader.ResultName]: null,
    [OneTrustAssessmentCsvHeader.State]: null,
    [OneTrustAssessmentCsvHeader.Tags]: null,
    [OneTrustAssessmentCsvHeader.TargetRiskScore]: null,
    [OneTrustAssessmentCsvHeader.TemplateId]: null,
    [OneTrustAssessmentCsvHeader.TemplateName]: null,
    [OneTrustAssessmentCsvHeader.TemplateRootVersionId]: null,
    [OneTrustAssessmentCsvHeader.AssessmentNumber]: null,
    [OneTrustAssessmentCsvHeader.CompletedOn]: null,
    [OneTrustAssessmentCsvHeader.Status]: null,
    [OneTrustAssessmentCsvHeader.CreatedBy_Id]: null,
    [OneTrustAssessmentCsvHeader.CreatedBy_Name]: null,
    [OneTrustAssessmentCsvHeader.CreatedBy_NameKey]: null,
    [OneTrustAssessmentCsvHeader.CreatedDT]: null,
    [OneTrustAssessmentCsvHeader.Deadline]: null,
    [OneTrustAssessmentCsvHeader.Description]: null,
    [OneTrustAssessmentCsvHeader.LowRisk]: null,
    [OneTrustAssessmentCsvHeader.MediumRisk]: null,
    [OneTrustAssessmentCsvHeader.HighRisk]: null,
    [OneTrustAssessmentCsvHeader.OrgGroup_Id]: null,
    [OneTrustAssessmentCsvHeader.OrgGroup_Name]: null,
    [OneTrustAssessmentCsvHeader.OrgGroup_NameKey]: null,
    [OneTrustAssessmentCsvHeader.PrimaryRecordType]: null,
    [OneTrustAssessmentCsvHeader.RiskLevel]: null,
    [OneTrustAssessmentCsvHeader.SubmittedOn]: null,
    [OneTrustAssessmentCsvHeader.Template_Id]: null,
    [OneTrustAssessmentCsvHeader.Template_Name]: null,
    [OneTrustAssessmentCsvHeader.Template_NameKey]: null,
    [OneTrustAssessmentCsvHeader.TotalRiskCount]: null,
    [OneTrustAssessmentCsvHeader.VeryHighRisk]: null,
    [OneTrustAssessmentCsvHeader.WelcomeText]: null,
    [OneTrustAssessmentCsvHeader.Approvers_Id]: null,
    [OneTrustAssessmentCsvHeader.Approvers_WorkflowStageId]: null,
    [OneTrustAssessmentCsvHeader.Approvers_Name]: null,
    [OneTrustAssessmentCsvHeader.Approvers_Approver_Id]: null,
    [OneTrustAssessmentCsvHeader.Approvers_Approver_FullName]: null,
    [OneTrustAssessmentCsvHeader.Approvers_Approver_Email]: null,
    [OneTrustAssessmentCsvHeader.Approvers_Approver_Deleted]: null,
    [OneTrustAssessmentCsvHeader.Approvers_Approver_AssigneeType]: null,
    [OneTrustAssessmentCsvHeader.Approvers_ApprovalState]: null,
    [OneTrustAssessmentCsvHeader.Approvers_ApprovedOn]: null,
    [OneTrustAssessmentCsvHeader.Approvers_ResultId]: null,
    [OneTrustAssessmentCsvHeader.Approvers_ResultName]: null,
    [OneTrustAssessmentCsvHeader.Approvers_ResultNameKey]: null,
    [OneTrustAssessmentCsvHeader.Respondents_Id]: null,
    [OneTrustAssessmentCsvHeader.Respondents_Name]: null,
    [OneTrustAssessmentCsvHeader.Respondents_NameKey]: null,
    [OneTrustAssessmentCsvHeader.PrimaryEntityDetails_Id]: null,
    [OneTrustAssessmentCsvHeader.PrimaryEntityDetails_Name]: null,
    [OneTrustAssessmentCsvHeader.PrimaryEntityDetails_Number]: null,
    [OneTrustAssessmentCsvHeader.PrimaryEntityDetails_DisplayName]: null,
    [OneTrustAssessmentCsvHeader.PrimaryEntityDetails_RelationshipResponseDetails]: null,
    [OneTrustAssessmentCsvHeader.PrimaryEntityDetails_EntityBusinessKey]: null,
    [OneTrustAssessmentCsvHeader.Sections_HasNavigationRules]: null,
    [OneTrustAssessmentCsvHeader.Sections_SubmittedBy_Id]: null,
    [OneTrustAssessmentCsvHeader.Sections_SubmittedBy_Name]: null,
    [OneTrustAssessmentCsvHeader.Sections_SubmittedBy_NameKey]: null,
    [OneTrustAssessmentCsvHeader.Sections_SubmittedDt]: null,
    [OneTrustAssessmentCsvHeader.Sections_Name]: null,
    [OneTrustAssessmentCsvHeader.Sections_Hidden]: null,
    [OneTrustAssessmentCsvHeader.Sections_Valid]: null,
    [OneTrustAssessmentCsvHeader.Sections_SectionId]: null,
    [OneTrustAssessmentCsvHeader.Sections_Sequence]: null,
    [OneTrustAssessmentCsvHeader.Sections_Submitted]: null,
    [OneTrustAssessmentCsvHeader.Sections_Description]: null,
    [OneTrustAssessmentCsvHeader.Sections_Status]: null,
    [OneTrustAssessmentCsvHeader.Sections_OpenNMIQuestionIds]: null,
    [OneTrustAssessmentCsvHeader.Sections_InvalidQuestionIds]: null,
    [OneTrustAssessmentCsvHeader.Sections_RequiredUnansweredQuestionIds]: null,
    [OneTrustAssessmentCsvHeader.Sections_RequiredQuestionIds]: null,
    [OneTrustAssessmentCsvHeader.Sections_UnansweredQuestionIds]: null,
    [OneTrustAssessmentCsvHeader.Sections_EffectivenessQuestionIds]: null,
    [OneTrustAssessmentCsvHeader.Sections_NameKey]: null,
    [OneTrustAssessmentCsvHeader.Sections_RiskStatistics_MaxRiskLevel]: null,
    [OneTrustAssessmentCsvHeader.Sections_RiskStatistics_RiskCount]: null,
    [OneTrustAssessmentCsvHeader.Sections_RiskStatistics_SectionId]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Hidden]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_LockReason]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_CopyErrors]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_HasNavigationRules]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_RootRequestInformationIds]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_TotalAttachments]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_AttachmentIds]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_CanReopenWithAllowEditOption]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_RiskCreationAllowed]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_RiskDeletionPopupAllowed]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_AllowMaturityScaleOnQuestions]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionAssociations]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Issues]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_ResponseEditableWhileUnderReview]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_BusinessKeyReference]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Topic]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionLaws]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_AttachmentRequired]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_ResponseFilter]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_LinkAssessmentToResponseEntity]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_TranslationIdentifier]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_ReadOnly]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Schema]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_AttributeId]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_VendorQuestion]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Seeded]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_AllowJustification]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_AssetQuestion]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_EntityQuestion]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Paquestion]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_InventoryTypeEnum]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_ForceOther]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_IsParentQuestionMultiSelect]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Id]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_RootVersionId]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Sequence]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionType]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Required]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Attributes]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_FriendlyName]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Description]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Hint]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_ParentQuestionId]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_PrePopulateResponse]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_LinkAssessmentToInventory]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Valid]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Type]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_AllowMultiSelect]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Content]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_RequireJustification]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Options_TranslationIdentifier]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Options_Id]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Options_Option]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Options_OptionKey]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Options_Hint]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Options_HintKey]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Options_Score]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Options_PreSelectedOption]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Options_Sequence]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Options_Attributes]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Options_OptionType]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_QuestionId]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_RiskId]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Level]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Score]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Probability]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_ImpactLevel]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Description]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Name]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Treatment]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_TreatmentStatus]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Type]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Stage_CurrentStageApprovers]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Stage_BadgeColor]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Stage_Id]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Stage_Name]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Stage_NameKey]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_State]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Result]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Categories_Seeded]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Categories_Id]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Categories_Name]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_Risks_Categories_NameKey]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_MaturityScale]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_EffectivenessScale]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_ParentAssessmentDetailId]:
      null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_DisplayLabel]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_ParentQuestionType]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_ParentResponseId]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_IsLocalVersion]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_RelationshipDisplayInformation]:
      null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_LockReason]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_ControlResponse]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_RelationshipResponseDetails]:
      null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_TextRedacted]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_ResponseMap]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_ResponseId]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_Response]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_ResponseKey]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_ContractResponse]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_Type]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_ResponseSourceType]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_ErrorCode]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_Valid]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_DataSubject_Id]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_DataSubject_Name]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_DataSubject_NameKey]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_DataCategory_Id]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_DataCategory_Name]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_DataCategory_NameKey]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_DataElement_Id]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_DataElement_Name]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_DataElement_NameKey]: null,
    [OneTrustAssessmentCsvHeader.Sections_Questions_QuestionResponses_Justification]: null,
  }),
  /** The values of the header */
  t.string,
);

/**
 * Type override
 */
export type OneTrustAssessmentCsvRecord = t.TypeOf<typeof OneTrustAssessmentCsvRecord>;

/* eslint-enable max-lines */
