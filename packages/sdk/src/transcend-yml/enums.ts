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

/** Status of the data processing agreement (DPA) for a data silo. */
export const DataProcessingAgreementStatus = {
  /** Vendor provides a standard online DPA */
  OnlineDpa: 'ONLINE_DPA',
  /** Organization negotiated a custom DPA */
  CustomDpa: 'CUSTOM_DPA',
  /** Existing DPA needs to be updated */
  RequiresUpdate: 'REQUIRES_UPDATE',
  /** No DPA is required for this vendor or integration */
  NotRequired: 'NOT_REQUIRED',
  /** DPA is required but not yet on file */
  Missing: 'MISSING',
} as const;

/** Data processing agreement status type */
export type DataProcessingAgreementStatus =
  (typeof DataProcessingAgreementStatus)[keyof typeof DataProcessingAgreementStatus];

/** How a custom data silo connects when processing privacy requests. */
export const CustomSiloConnectionStrategy = {
  /** Use the configured webhook URL */
  Webhook: 'WEBHOOK',
  /** Use a custom serverless function */
  CustomFunction: 'CUSTOM_FUNCTION',
} as const;

/** Custom silo connection strategy type */
export type CustomSiloConnectionStrategy =
  (typeof CustomSiloConnectionStrategy)[keyof typeof CustomSiloConnectionStrategy];

/** Consent Manager recommendation for connecting a data silo. */
export const ConsentManagerConnectionStatus = {
  Regulated: 'REGULATED',
  PartiallyRegulated: 'PARTIALLY_REGULATED',
  Detected: 'DETECTED',
  PendingRegulation: 'PENDING_REGULATION',
  VeryLikely: 'VERY_LIKELY',
  Possible: 'POSSIBLE',
  NotRecommended: 'NOT_RECOMMENDED',
  Undetermined: 'UNDETERMINED',
} as const;

/** Consent Manager connection recommendation type */
export type ConsentManagerConnectionStatus =
  (typeof ConsentManagerConnectionStatus)[keyof typeof ConsentManagerConnectionStatus];

/** Privacy request automation recommendation for connecting a data silo. */
export const PrivacyRequestConnectionStatus = {
  Connected: 'CONNECTED',
  PendingConnection: 'PENDING_CONNECTION',
  VeryLikely: 'VERY_LIKELY',
  Likely: 'LIKELY',
  Possible: 'POSSIBLE',
  NotRecommended: 'NOT_RECOMMENDED',
  Undetermined: 'UNDETERMINED',
} as const;

/** Privacy request connection recommendation type */
export type PrivacyRequestConnectionStatus =
  (typeof PrivacyRequestConnectionStatus)[keyof typeof PrivacyRequestConnectionStatus];

/** Whether the data silo is believed to store personal data. */
export const HasPersonalDataStatus = {
  Yes: 'YES',
  Likely: 'LIKELY',
  Unlikely: 'UNLIKELY',
  No: 'NO',
  Unspecified: 'UNSPECIFIED',
} as const;

/** Personal data presence status type */
export type HasPersonalDataStatus =
  (typeof HasPersonalDataStatus)[keyof typeof HasPersonalDataStatus];

/**
 * Resources that can be pulled in
 */
/** Opt-in rules for offline transcend.yml validation */
export enum TranscendYamlCheckRule {
  ConsentSitesHaveOwners = 'consentSitesHaveOwners',
  ConsentSitesInDomains = 'consentSitesInDomains',
  UniqueConsentSiteHosts = 'uniqueConsentSiteHosts',
  UniqueTrackers = 'uniqueTrackers',
}

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
