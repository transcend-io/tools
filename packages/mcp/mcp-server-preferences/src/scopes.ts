import { ScopeName } from '@transcend-io/privacy-types';

/** OAuth scopes required for Preference MCP tools (offline_access added by base). */
export const PREFERENCE_OAUTH_SCOPES = [
  ScopeName.ViewPrivacyCenter,
  ScopeName.ManagePrivacyCenter,
] as const;
