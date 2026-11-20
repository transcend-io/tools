import { ScopeName } from '@transcend-io/privacy-types';

/** OAuth scopes required for Privacy Center MCP tools (offline_access added by base). */
export const PRIVACY_CENTER_OAUTH_SCOPES = [
  ScopeName.ViewPrivacyCenter,
  ScopeName.ManagePrivacyCenter,
  ScopeName.ViewIntlMessages,
  ScopeName.ManageIntlMessages,
  ScopeName.ViewPolicies,
  ScopeName.ManagePolicies,
] as const;
