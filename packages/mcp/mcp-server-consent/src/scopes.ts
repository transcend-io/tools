import { ScopeName } from '@transcend-io/privacy-types';

/** OAuth scopes required for Consent MCP tools (offline_access added by base). */
export const CONSENT_OAUTH_SCOPES = [
  ScopeName.ViewConsentManager,
  ScopeName.ViewAssignedConsentManager,
  ScopeName.ManageConsentManager,
  ScopeName.ManageAssignedConsentManager,
  ScopeName.ViewDataFlow,
  ScopeName.ManageDataFlow,
] as const;
