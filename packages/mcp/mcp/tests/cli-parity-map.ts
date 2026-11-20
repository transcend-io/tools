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
  [TranscendPullResource.Attributes]: { read: [], write: [] },
  [TranscendPullResource.Templates]: {
    read: ['workflows_list_email_templates'],
    write: ['workflows_write_email_templates'],
  },
  [TranscendPullResource.DataSilos]: {
    read: ['inventory_list_data_silos', 'inventory_get_data_silo'],
    write: ['inventory_write_data_silo'],
  },
  [TranscendPullResource.Enrichers]: {
    read: ['dsr_list_enrichers'],
    write: ['dsr_write_enrichers'],
  },
  [TranscendPullResource.DataFlows]: {
    read: ['consent_list_data_flows'],
    write: ['consent_update_data_flows'],
  },
  [TranscendPullResource.BusinessEntities]: {
    read: ['inventory_list_business_entities'],
    write: [],
  },
  [TranscendPullResource.ProcessingActivities]: { read: [], write: [] },
  [TranscendPullResource.Actions]: { read: ['dsr_list_actions'], write: ['dsr_write_actions'] },
  [TranscendPullResource.DataSubjects]: { read: ['inventory_list_data_subjects'], write: [] },
  [TranscendPullResource.Identifiers]: { read: ['inventory_list_identifiers'], write: [] },
  [TranscendPullResource.Cookies]: {
    read: ['consent_list_cookies'],
    write: ['consent_update_cookies'],
  },
  [TranscendPullResource.ConsentSites]: {
    read: ['consent_list_sites'],
    write: ['consent_write_sites'],
  },
  [TranscendPullResource.ConsentManager]: { read: ['consent_list_airgap_bundles'], write: [] },
  [TranscendPullResource.Partitions]: { read: ['preferences_list_partitions'], write: [] },
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
  [TranscendPullResource.Teams]: { read: ['admin_list_teams'], write: [] },
  [TranscendPullResource.PrivacyCenters]: { read: ['admin_get_privacy_center'], write: [] },
  [TranscendPullResource.Policies]: { read: [], write: [] },
  [TranscendPullResource.Messages]: { read: [], write: [] },
  [TranscendPullResource.Assessments]: {
    read: ['assessments_list', 'assessments_get'],
    write: ['assessments_create', 'assessments_update'],
  },
  [TranscendPullResource.AssessmentTemplates]: {
    read: ['assessments_list_templates'],
    write: ['assessments_create_template'],
  },
  [TranscendPullResource.Purposes]: { read: ['consent_list_purposes'], write: [] },
  [TranscendPullResource.PreferenceOptions]: { read: [], write: [] },
  [TranscendPullResource.SystemDiscovery]: { read: [], write: [] },
  [TranscendPullResource.PreferenceWorkflowConfigs]: { read: [], write: [] },
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
  [TranscendPullResource.Attributes]: { read: true, write: true },
  [TranscendPullResource.BusinessEntities]: { write: true },
  [TranscendPullResource.ProcessingActivities]: { read: true, write: true },
  [TranscendPullResource.DataSubjects]: { write: true },
  [TranscendPullResource.Identifiers]: { write: true },
  [TranscendPullResource.ConsentManager]: { write: true },
  [TranscendPullResource.Partitions]: { write: true },
  [TranscendPullResource.ActionItems]: { read: true, write: true },
  [TranscendPullResource.ActionItemCollections]: { read: true, write: true },
  [TranscendPullResource.Teams]: { write: true },
  [TranscendPullResource.PrivacyCenters]: { write: true },
  [TranscendPullResource.Policies]: { read: true, write: true },
  [TranscendPullResource.Messages]: { read: true, write: true },
  [TranscendPullResource.Purposes]: { write: true },
  [TranscendPullResource.PreferenceOptions]: { read: true, write: true },
  [TranscendPullResource.SystemDiscovery]: { read: true, write: true },
  [TranscendPullResource.PreferenceWorkflowConfigs]: { read: true, write: true },
};

/**
 * Sections with no write tool by design. CLI push only resolves API key titles
 * for these, so there is nothing to create or update.
 */
export const READ_ONLY_BY_DESIGN: readonly TranscendPullResource[] = [
  TranscendPullResource.ApiKeys,
];
