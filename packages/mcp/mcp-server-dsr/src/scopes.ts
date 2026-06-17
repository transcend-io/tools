import { ScopeName } from '@transcend-io/privacy-types';

/** OAuth scopes required for DSR MCP tools (offline_access added by base). */
export const DSR_OAUTH_SCOPES = [
  ScopeName.ViewRequests,
  ScopeName.MakeDataSubjectRequest,
  ScopeName.ManageAssignedRequests,
  ScopeName.ViewRequestCompilation,
  ScopeName.ManageRequestCompilation,
] as const;
