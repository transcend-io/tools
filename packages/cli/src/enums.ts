import { makeEnum } from '@transcend-io/type-utils';

/** Accepted file formats for exporting resources from OneTrust */
export enum OneTrustFileFormat {
  Json = 'json',
}

/**
 * Resources that can be pulled in from OneTrust
 */
export enum OneTrustPullResource {
  Assessments = 'assessments',
}

/**
 * Where to read OneTrust resources from
 */
export enum OneTrustPullSource {
  OneTrust = 'oneTrust',
  File = 'file',
}

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
  ConsentManager = 'consentManager',
  Partitions = 'partitions',
  Prompts = 'prompts',
  PromptPartials = 'promptPartials',
  PromptGroups = 'promptGroups',
  Agents = 'agents',
  AgentFunctions = 'agentFunctions',
  AgentFiles = 'agentFiles',
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
