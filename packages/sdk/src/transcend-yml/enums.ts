/** Template delivery channel for org email templates. */
export const TemplateDeliveryType = {
  /** Email template */
  Email: 'EMAIL',
  /** Text (SMS) template */
  Text: 'TEXT',
} as const;

/** Template delivery channel type */
export type TemplateDeliveryType = (typeof TemplateDeliveryType)[keyof typeof TemplateDeliveryType];

/** Product line an org email template belongs to. */
export const TemplateProduct = {
  /** Data subject request automation */
  Dsr: 'DSR',
  /** Assessments product */
  Assessment: 'ASSESSMENT',
  /** Records of processing activities */
  Ropa: 'ROPA',
} as const;

/** Template product line type */
export type TemplateProduct = (typeof TemplateProduct)[keyof typeof TemplateProduct];

/**
 * Resources that can be pulled in
 */
export enum TranscendPullResource {
  ApiKeys = 'apiKeys',
  Attributes = 'customFields',
  Templates = 'templates',
  DataSilos = 'dataSilos',
  Enrichers = 'enrichers',
  DataFlows = 'dataFlows',
  BusinessEntities = 'businessEntities',
  ProcessingActivities = 'processingActivities',
  Actions = 'actions',
  DataSubjects = 'dataSubjects',
  Identifiers = 'identifiers',
  Cookies = 'cookies',
  ConsentSites = 'consentSites',
  ConsentManager = 'consentManager',
  Partitions = 'partitions',
  Vendors = 'vendors',
  DataCategories = 'dataCategories',
  ProcessingPurposes = 'processingPurposes',
  ActionItems = 'actionItems',
  ActionItemCollections = 'actionItemCollections',
  Teams = 'teams',
  PrivacyCenters = 'privacyCenters',
  Policies = 'policies',
  Messages = 'messages',
  Assessments = 'assessments',
  AssessmentTemplates = 'assessmentTemplates',
  Purposes = 'purposes',
  PreferenceOptions = 'preferenceOptions',
  SystemDiscovery = 'systemDiscovery',
  PreferenceWorkflowConfigs = 'preferenceWorkflowConfigs',
  WorkflowConfigs = 'workflowConfigs',
}
