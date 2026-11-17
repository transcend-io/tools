import { ScopeName } from '@transcend-io/privacy-types';

/** OAuth scopes required for DSR MCP tools (offline_access added by base). */
export const DSR_OAUTH_SCOPES = [
  ScopeName.ViewRequests,
  ScopeName.ViewAssignedRequests,
  ScopeName.MakeDataSubjectRequest,
  ScopeName.ManageAssignedRequests,
  ScopeName.ViewRequestCompilation,
  ScopeName.ManageRequestCompilation,
  ScopeName.ViewWorkflows,
  // Enrichers and actions: view for the list tools, manage for the write tools.
  ScopeName.ViewRequestIdentitySettings,
  ScopeName.ManageRequestIdentities,
  ScopeName.ViewDataSubjectRequestSettings,
  ScopeName.ManageDataSubjectRequestSettings,
] as const;
