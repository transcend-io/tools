import { ScopeName } from '@transcend-io/privacy-types';

import type { TranscendInput } from './codecs.js';
import { TranscendPullResource } from './enums.js';

/**
 * Mapping between resource type and scopes required for cli
 */
export const TR_PUSH_RESOURCE_SCOPE_MAP: {
  [k in TranscendPullResource]: ScopeName[];
} = {
  [TranscendPullResource.ApiKeys]: [ScopeName.ViewApiKeys],
  [TranscendPullResource.Templates]: [ScopeName.ManageEmailTemplates],
  // ViewApiKeys — resolve api-key-title → apiKeyId when present on data silos
  [TranscendPullResource.DataSilos]: [
    ScopeName.ManageDataMap,
    ScopeName.ConnectDataSilos,
    ScopeName.ViewApiKeys,
  ],
  [TranscendPullResource.Enrichers]: [ScopeName.ManageRequestIdentities],
  [TranscendPullResource.BusinessEntities]: [ScopeName.ManageDataInventory],
  [TranscendPullResource.ProcessingActivities]: [ScopeName.ManageDataMap],
  [TranscendPullResource.Identifiers]: [ScopeName.ManageRequestIdentities],
  [TranscendPullResource.Attributes]: [ScopeName.ManageGlobalAttributes],
  [TranscendPullResource.DataFlows]: [ScopeName.ManageDataFlow],
  [TranscendPullResource.Cookies]: [ScopeName.ManageDataFlow],
  [TranscendPullResource.ConsentManager]: [ScopeName.ManageConsentManagerDeveloperSettings],
  [TranscendPullResource.Partitions]: [ScopeName.ManageConsentManagerDeveloperSettings],
  [TranscendPullResource.Actions]: [ScopeName.ManageDataSubjectRequestSettings],
  [TranscendPullResource.DataSubjects]: [ScopeName.ManageDataSubjectRequestSettings],
  [TranscendPullResource.Vendors]: [ScopeName.ManageDataInventory],
  [TranscendPullResource.DataCategories]: [ScopeName.ManageDataInventory],
  [TranscendPullResource.ProcessingPurposes]: [ScopeName.ManageDataInventory],
  [TranscendPullResource.ActionItems]: [
    ScopeName.ManageAllActionItems,
    ScopeName.ViewGlobalAttributes,
  ],
  [TranscendPullResource.ActionItemCollections]: [ScopeName.ManageActionItemCollections],
  [TranscendPullResource.Teams]: [ScopeName.ManageAccessControl],
  [TranscendPullResource.Messages]: [ScopeName.ManageIntlMessages],
  [TranscendPullResource.PrivacyCenters]: [ScopeName.ManagePrivacyCenter],
  [TranscendPullResource.Policies]: [ScopeName.ManagePolicies],
  [TranscendPullResource.Assessments]: [ScopeName.ManageAssessments],
  [TranscendPullResource.AssessmentTemplates]: [ScopeName.ManageAssessments],
  [TranscendPullResource.Purposes]: [
    ScopeName.ManageConsentManager,
    ScopeName.ManagePreferenceStoreSettings,
  ],
  [TranscendPullResource.PreferenceOptions]: [ScopeName.ManagePreferenceStoreSettings],
  [TranscendPullResource.SystemDiscovery]: [ScopeName.ManageDataMap],
  // Primary: ManagePreferenceStoreSettings (createOrUpdateConsentWorkflowTrigger).
  // Related fetches used during sync:
  // - ViewDataSubjectRequestSettings — resolve action-type / data-subject-type (legacy)
  // - ViewConsentManager — resolve purposes[].tracking-type → purposeId
  // - ViewDataMap — resolve data-silo-titles (legacy, only when present)
  // - ManageWorkflows — list DSR workflows when workflow-title is set (V2)
  [TranscendPullResource.PreferenceWorkflowConfigs]: [
    ScopeName.ManagePreferenceStoreSettings,
    ScopeName.ViewDataSubjectRequestSettings,
    ScopeName.ViewConsentManager,
    ScopeName.ViewDataMap,
    ScopeName.ManageWorkflows,
  ],
  // ManageWorkflows inherits ViewDataSubjectRequestSettings and ViewGlobalAttributes
  // (needed to resolve action/data-subject/attribute-key names to IDs on push)
  [TranscendPullResource.WorkflowConfigs]: [ScopeName.ManageWorkflows],
};

/**
 * Mapping between resource type and scopes required for cli
 */
export const TR_PULL_RESOURCE_SCOPE_MAP: {
  [k in TranscendPullResource]: ScopeName[];
} = {
  [TranscendPullResource.ApiKeys]: [ScopeName.ViewApiKeys],
  [TranscendPullResource.Templates]: [ScopeName.ViewEmailTemplates],
  // ViewApiKeys — dataSilos.apiKeys on the enriched pull query
  [TranscendPullResource.DataSilos]: [
    ScopeName.ViewDataMap,
    ScopeName.ViewDataSubjectRequestSettings,
    ScopeName.ViewApiKeys,
  ],
  [TranscendPullResource.Enrichers]: [ScopeName.ViewRequestIdentitySettings],
  [TranscendPullResource.BusinessEntities]: [ScopeName.ViewDataInventory],
  [TranscendPullResource.ProcessingActivities]: [ScopeName.ViewDataInventory],
  [TranscendPullResource.Identifiers]: [ScopeName.ViewRequestIdentitySettings],
  [TranscendPullResource.Attributes]: [ScopeName.ViewGlobalAttributes],
  [TranscendPullResource.DataFlows]: [ScopeName.ViewDataFlow],
  [TranscendPullResource.Cookies]: [ScopeName.ViewDataFlow],
  [TranscendPullResource.ConsentManager]: [ScopeName.ViewConsentManager],
  [TranscendPullResource.Partitions]: [ScopeName.ViewConsentManager],
  [TranscendPullResource.Actions]: [ScopeName.ViewDataSubjectRequestSettings],
  [TranscendPullResource.DataSubjects]: [ScopeName.ViewDataSubjectRequestSettings],
  [TranscendPullResource.Vendors]: [ScopeName.ViewDataInventory],
  [TranscendPullResource.DataCategories]: [ScopeName.ViewDataInventory],
  [TranscendPullResource.ProcessingPurposes]: [ScopeName.ViewDataInventory],
  [TranscendPullResource.ActionItemCollections]: [ScopeName.ViewAllActionItems],
  [TranscendPullResource.ActionItems]: [ScopeName.ViewAllActionItems],
  [TranscendPullResource.Teams]: [ScopeName.ViewScopes],
  [TranscendPullResource.Messages]: [ScopeName.ViewIntlMessages],
  [TranscendPullResource.PrivacyCenters]: [ScopeName.ViewPrivacyCenter],
  [TranscendPullResource.Policies]: [ScopeName.ViewPolicies],
  [TranscendPullResource.Assessments]: [ScopeName.ViewAssessments],
  [TranscendPullResource.AssessmentTemplates]: [ScopeName.ViewAssessments],
  [TranscendPullResource.Purposes]: [
    ScopeName.ViewConsentManager,
    ScopeName.ViewPreferenceStoreSettings,
  ],
  [TranscendPullResource.PreferenceOptions]: [ScopeName.ViewPreferenceStoreSettings],
  [TranscendPullResource.SystemDiscovery]: [ScopeName.ViewDataMap],
  // ViewPreferenceStoreSettings — consentWorkflowTriggers GraphQL query
  // ManageWorkflows — resolve workflowConfigId → workflow-title for V2 configs
  [TranscendPullResource.PreferenceWorkflowConfigs]: [
    ScopeName.ViewPreferenceStoreSettings,
    ScopeName.ManageWorkflows,
  ],
  [TranscendPullResource.WorkflowConfigs]: [ScopeName.ViewWorkflows],
};

export const TR_YML_RESOURCE_TO_FIELD_NAME: Record<TranscendPullResource, keyof TranscendInput> = {
  [TranscendPullResource.ApiKeys]: 'api-keys',
  [TranscendPullResource.Attributes]: 'attributes',
  [TranscendPullResource.DataFlows]: 'data-flows',
  [TranscendPullResource.Cookies]: 'cookies',
  [TranscendPullResource.ConsentManager]: 'consent-manager',
  [TranscendPullResource.Partitions]: 'partitions',
  [TranscendPullResource.Actions]: 'actions',
  [TranscendPullResource.DataSubjects]: 'data-subjects',
  [TranscendPullResource.BusinessEntities]: 'business-entities',
  [TranscendPullResource.ProcessingActivities]: 'processing-activities',
  [TranscendPullResource.Identifiers]: 'identifiers',
  [TranscendPullResource.Enrichers]: 'preflights',
  [TranscendPullResource.DataSilos]: 'data-silos',
  [TranscendPullResource.Templates]: 'templates',
  [TranscendPullResource.Vendors]: 'vendors',
  [TranscendPullResource.DataCategories]: 'data-categories',
  [TranscendPullResource.ProcessingPurposes]: 'processing-purposes',
  [TranscendPullResource.ActionItems]: 'action-items',
  [TranscendPullResource.ActionItemCollections]: 'action-item-collections',
  [TranscendPullResource.Teams]: 'teams',
  [TranscendPullResource.Messages]: 'messages',
  [TranscendPullResource.PrivacyCenters]: 'privacy-center',
  [TranscendPullResource.Policies]: 'policies',
  [TranscendPullResource.Assessments]: 'assessments',
  [TranscendPullResource.AssessmentTemplates]: 'assessment-templates',
  [TranscendPullResource.Purposes]: 'purposes',
  [TranscendPullResource.PreferenceOptions]: 'preference-options',
  [TranscendPullResource.SystemDiscovery]: 'system-discovery',
  [TranscendPullResource.PreferenceWorkflowConfigs]: 'preference-workflow-configs',
  [TranscendPullResource.WorkflowConfigs]: 'workflow-configs',
};
