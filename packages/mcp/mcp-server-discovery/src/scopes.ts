import { ScopeName } from '@transcend-io/privacy-types';

/** OAuth scopes required for Discovery MCP tools (offline_access added by base). */
export const DISCOVERY_OAUTH_SCOPES = [
  ScopeName.ViewDataMap,
  ScopeName.ViewCodeScanning,
  ScopeName.ManageCodeScanning,
  ScopeName.ViewPrompts,
  ScopeName.ViewPromptRuns,
  ScopeName.ExecutePrompt,
] as const;
