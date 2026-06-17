import { ScopeName } from '@transcend-io/privacy-types';

/** OAuth scopes required for Admin MCP tools (offline_access added by base). */
export const ADMIN_OAUTH_SCOPES = [
  ScopeName.ViewEmployees,
  ScopeName.ViewApiKeys,
  ScopeName.ManageApiKeys,
] as const;
