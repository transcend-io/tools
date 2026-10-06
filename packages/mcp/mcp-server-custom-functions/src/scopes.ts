import { ScopeName } from '@transcend-io/privacy-types';

/** OAuth scopes required for Custom Functions MCP tools (offline_access added by base). */
export const CUSTOM_FUNCTIONS_OAUTH_SCOPES = [
  ScopeName.ViewCustomFunction,
  ScopeName.ManageCustomFunction,
  ScopeName.ManageSombraRootKeys,
  ScopeName.ConnectDataSilos,
  ScopeName.ManageAccessControl,
] as const;
