import { ScopeName } from '@transcend-io/privacy-types';

/**
 * OAuth scopes required for Preference MCP tools (offline_access added by base).
 *
 * The last five are the transcend.yml scopes for partitions, preference-options and
 * preference-workflow-configs (see `TR_PULL_RESOURCE_SCOPE_MAP` and
 * `TR_PUSH_RESOURCE_SCOPE_MAP` in the SDK).
 */
export const PREFERENCE_OAUTH_SCOPES = [
  ScopeName.ViewManagedConsentDatabaseAdminApi,
  ScopeName.ManageStoredPreferences,
  ScopeName.ViewConsentManager,
  ScopeName.ManageConsentManagerDeveloperSettings,
  ScopeName.ViewPreferenceStoreSettings,
  ScopeName.ManagePreferenceStoreSettings,
  ScopeName.ViewDataSubjectRequestSettings,
  ScopeName.ViewDataMap,
  ScopeName.ManageWorkflows,
] as const;
