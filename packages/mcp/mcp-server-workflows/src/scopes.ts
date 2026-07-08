import { ScopeName } from '@transcend-io/privacy-types';

/** OAuth scopes required for Workflow MCP tools (offline_access added by base). */
export const WORKFLOW_OAUTH_SCOPES = [
  ScopeName.ViewAllActionItems,
  ScopeName.ManageAllActionItems,
  ScopeName.ViewEmailTemplates,
] as const;
