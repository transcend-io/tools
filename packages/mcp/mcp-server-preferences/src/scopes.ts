import { ScopeName } from '@transcend-io/privacy-types';

/** OAuth scopes required for Preference MCP tools (offline_access added by base). */
export const PREFERENCE_OAUTH_SCOPES = [
  ScopeName.ViewManagedConsentDatabaseAdminApi,
  ScopeName.ManageStoredPreferences,
  ScopeName.ViewConsentManager,
] as const;
