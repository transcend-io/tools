import { ScopeName } from '@transcend-io/privacy-types';

/** OAuth scopes required for Assessment MCP tools (offline_access added by base). */
export const ASSESSMENT_OAUTH_SCOPES = [
  ScopeName.ViewAssessments,
  ScopeName.ManageAssessments,
] as const;
