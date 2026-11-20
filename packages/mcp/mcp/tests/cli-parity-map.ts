import { TranscendPullResource } from '@transcend-io/sdk';

/** MCP tools that read and write one `transcend.yml` section. */
export interface SectionTools {
  /** Tools that list or get the section's resources. */
  read: string[];
  /** Tools that create or update the section's resources. */
  write: string[];
}

/**
 * Direct MCP tools for every section the CLI can pull or push.
 *
 * Typed over the CLI enum, so a new CLI section fails type-check until someone
 * maps it here. The generic `config_pull` and `config_push` tools cover every
 * section already. These direct tools are for callers that want one subset
 * without a file on disk.
 */
export const CLI_SECTION_TOOLS: Record<TranscendPullResource, SectionTools> = {
  [TranscendPullResource.ApiKeys]: { read: ['admin_list_api_keys'], write: [] },
  [TranscendPullResource.Attributes]: {
    read: ['inventory_list_custom_fields'],
    write: ['inventory_write_custom_fields'],
  },
  [TranscendPullResource.Templates]: {
    read: ['workflows_list_email_templates'],
    write: ['workflows_write_email_templates'],
  },
  [TranscendPullResource.DataSilos]: {
    read: ['inventory_list_data_silos', 'inventory_get_data_silo'],
    write: ['inventory_write_data_silo'],
  },
  [TranscendPullResource.Enrichers]: { read: [], write: [] },
  [TranscendPullResource.DataFlows]: {
    read: ['consent_list_data_flows'],
    write: ['consent_update_data_flows'],
  },
  [TranscendPullResource.BusinessEntities]: {
    read: ['inventory_list_business_entities'],
    write: ['inventory_write_business_entities'],
  },
  [TranscendPullResource.ProcessingActivities]: {
    read: ['inventory_list_processing_activities'],
    write: ['inventory_write_processing_activities'],
  },
  [TranscendPullResource.Actions]: { read: [], write: [] },
  [TranscendPullResource.DataSubjects]: {
    read: ['inventory_list_data_subjects'],
    write: ['inventory_write_data_subjects'],
  },
  [TranscendPullResource.Identifiers]: {
    read: ['inventory_list_identifiers'],
    write: ['inventory_write_identifiers'],
  },
  [TranscendPullResource.Cookies]: {
    read: ['consent_list_cookies'],
    write: ['consent_update_cookies'],
  },
  [TranscendPullResource.ConsentSites]: {
    read: ['consent_list_sites'],
    write: ['consent_write_sites'],
  },
  [TranscendPullResource.ConsentManager]: {
    read: ['consent_list_airgap_bundles'],
    write: ['consent_write_consent_manager'],
  },
  [TranscendPullResource.Partitions]: {
    read: ['preferences_list_partitions'],
    write: ['preferences_write_partitions'],
  },
  [TranscendPullResource.Vendors]: {
    read: ['inventory_list_vendors'],
    write: ['inventory_write_vendor'],
  },
  [TranscendPullResource.DataCategories]: {
    read: ['inventory_list_categories'],
    write: ['inventory_write_category'],
  },
  [TranscendPullResource.ProcessingPurposes]: {
    read: ['inventory_list_processing_purposes'],
    write: ['inventory_write_processing_purpose'],
  },
  [TranscendPullResource.ActionItems]: { read: [], write: [] },
  [TranscendPullResource.ActionItemCollections]: { read: [], write: [] },
  [TranscendPullResource.Teams]: { read: ['admin_list_teams'], write: ['admin_write_teams'] },
  [TranscendPullResource.PrivacyCenters]: {
    read: ['privacy_center_get'],
    write: ['privacy_center_write'],
  },
  [TranscendPullResource.Policies]: {
    read: ['privacy_center_list_policies'],
    write: ['privacy_center_write_policies'],
  },
  [TranscendPullResource.Messages]: {
    read: ['privacy_center_list_intl_messages'],
    write: ['privacy_center_write_intl_messages'],
  },
  [TranscendPullResource.Assessments]: {
    read: ['assessments_list', 'assessments_get'],
    write: ['assessments_create', 'assessments_update'],
  },
  [TranscendPullResource.AssessmentTemplates]: {
    read: ['assessments_list_templates'],
    write: ['assessments_create_template'],
  },
  [TranscendPullResource.Purposes]: {
    read: ['consent_list_purposes'],
    write: ['consent_write_purposes'],
  },
  [TranscendPullResource.PreferenceOptions]: {
    read: ['preferences_list_option_values'],
    write: ['preferences_write_option_values'],
  },
  [TranscendPullResource.SystemDiscovery]: { read: [], write: [] },
  [TranscendPullResource.PreferenceWorkflowConfigs]: {
    read: ['preferences_list_workflow_configs'],
    write: ['preferences_write_workflow_configs'],
  },
  // `workflows_update_config` edits title, subtitle and description only. The CLI
  // push also creates configs and sets their steps.
  [TranscendPullResource.WorkflowConfigs]: {
    read: ['workflows_list'],
    write: ['workflows_update_config'],
  },
};

/** Direction of a gap. */
export interface SectionGap {
  /** No direct read tool yet. */
  read?: true;
  /** No direct write tool yet. */
  write?: true;
}

/**
 * Sections still missing a direct tool. Each PR that adds a tool removes its
 * entry. The parity test fails on an entry that is no longer true, so this list
 * only shrinks.
 */
export const PENDING_GAPS: Partial<Record<TranscendPullResource, SectionGap>> = {
  [TranscendPullResource.Enrichers]: { read: true, write: true },
  [TranscendPullResource.Actions]: { read: true, write: true },
  [TranscendPullResource.ActionItems]: { read: true, write: true },
  [TranscendPullResource.ActionItemCollections]: { read: true, write: true },
  [TranscendPullResource.SystemDiscovery]: { read: true, write: true },
};

/**
 * Sections with no write tool by design. CLI push only resolves API key titles
 * for these, so there is nothing to create or update.
 */
export const READ_ONLY_BY_DESIGN: readonly TranscendPullResource[] = [
  TranscendPullResource.ApiKeys,
];
