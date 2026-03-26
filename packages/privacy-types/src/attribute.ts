/**
 * Resources within the Transcend dashboard that support the attributes feature
 */
export enum AttributeSupportedResourceType {
  /** Action items table */
  ActionItem = 'actionItem',
  /** Airgap Cookie tabs */
  AirgapCookie = 'airgapCookie',
  /** Airgap Data Flow tabs */
  AirgapDataFlow = 'airgapDataFlow',
  /** AssessmentForm table */
  AssessmentForm = 'assessmentForm',
  /** AssessmentGroup table */
  AssessmentGroup = 'assessmentGroup',
  /** AuditorRun table */
  AuditorRun = 'auditorRun',
  /** AuditorSchedule table */
  AuditorSchedule = 'auditorSchedule',
  /** Business entity table */
  BusinessEntity = 'businessEntity',
  /** Categories table */
  DataSubCategory = 'dataSubCategory',
  /** Datapoint table */
  DataPoint = 'dataPoint',
  /** Datapoint level table */
  DataPointLevel = 'dataPointLevel',
  /** Data silos table */
  DataSilo = 'dataSilo',
  /** Enricher table */
  Enricher = 'enricher',
  /** Identifier table */
  Identifier = 'identifier',
  /** LegalHold table */
  LegalHold = 'legalHold',
  /** LegalMatter table */
  LegalMatter = 'legalMatter',
  /** Processing activity table */
  ProcessingActivity = 'processingActivity',
  /** Processing purpose table */
  ProcessingPurposeSubCategory = 'processingPurposeSubCategory',
  /** Prompt table */
  Prompt = 'prompt',
  /** PromptGroup table */
  PromptGroup = 'promptGroup',
  /** PromptRun table */
  PromptRun = 'promptRun',
  /** Requests table */
  Request = 'request',
  /** ScannedObject table */
  ScannedObject = 'scannedObject',
  /** ScannedObjectPath table */
  ScannedObjectPath = 'scannedObjectPath',
  /** Subject table */
  Subject = 'subject',
  /** Subdatapoints table (shows up under Data Inventory > Data Points tab) */
  SubDataPoint = 'subDataPoint',
  /** Vendor table */
  Vendor = 'vendor',
}

/**
 * Types for attribute keys
 */
export enum AttributeKeyType {
  /** Multiple attribute values from this attribute key can be assigned to a resource */
  MultiSelect = 'MULTI_SELECT',
  /** Only a single attribute value from this attribute key can be assigned to a resource */
  SingleSelect = 'SINGLE_SELECT',
  /** Text-based attribute */
  Text = 'TEXT',
  /** Email-based attribute */
  EMAIL = 'EMAIL',
  /** Phone-based attribute */
  TELEPHONE = 'TELEPHONE',
  /** URL-based attribute */
  URL = 'URL',
  /** Assessment attribute */
  Assessment = 'ASSESSMENT',
}
