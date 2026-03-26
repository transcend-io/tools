/**
 * These are the names of the template variables
 * that can be injected into an HTML template
 */
export enum TemplateVariableModelName {
  CustomField = 'customField',
  BusinessEntity = 'businessEntity',
  BusinessEntities = 'businessEntities',
  DataCategory = 'dataCategory',
  DataCategories = 'dataCategories',
  Vendor = 'vendor',
  Vendors = 'vendors',
  DataSilo = 'dataSilo',
  DataSilos = 'dataSilos',
  ProcessingPurpose = 'processingPurpose',
  ProcessingPurposes = 'processingPurposes',
  DataPointProperty = 'dataPointProperty',
  DataPointObject = 'dataPointObject',
  DataReport = 'dataReport',
  Actions = 'actions',
  Action = 'action',
  DataSubjects = 'dataSubjects',
  DataSubject = 'dataSubject',
  Identifiers = 'identifiers',
  Identifier = 'identifier',
  TrackingTechnologies = 'trackingTechnologies',
  DataFlows = 'dataFlows',
  DataFlow = 'dataFlow',
  Cookies = 'cookies',
  Cookie = 'cookie',
  Experiences = 'experiences',
  Experience = 'experience',
  Purposes = 'purposes',
  Purpose = 'purpose',
  Policies = 'policies',
  Policy = 'policy',
  PrivacyCenter = 'privacyCenter',
  CurrentUser = 'currentUser',
  Organization = 'organization',
  Workflows = 'workflows',
  Workflow = 'workflow',
}

/** Prompt status types */
export enum PromptStatus {
  Draft = 'DRAFT',
  Submitted = 'SUBMITTED',
  InReview = 'IN_REVIEW',
  ChangesRequested = 'CHANGES_REQUESTED',
  Rejected = 'REJECTED',
  Approved = 'APPROVED',
}

/**
 * The response format of a LLM prompt
 */
export enum PromptResponseFormat {
  Text = 'text',
  JsonObject = 'json_object',
  JsonSchema = 'json_schema',
}

/**
 * The purpose for uploading a file to a prompt or agent
 */
export enum PromptFilePurpose {
  Assistants = 'ASSISTANTS',
  FineTune = 'FINE_TUNE',
  FineTuneResults = 'FINE_TUNE_RESULTS',
  AssistantsOutput = 'ASSISTANTS_OUTPUT',
}

export const PROMPT_FILE_PURPOSE_TO_OPEN_AI: {
  [k in PromptFilePurpose]: string;
} = {
  [PromptFilePurpose.Assistants]: 'assistants',
  [PromptFilePurpose.AssistantsOutput]: 'assistants_output',
  [PromptFilePurpose.FineTune]: 'fine-tune',
  [PromptFilePurpose.FineTuneResults]: 'fine-tune-results',
};
