import { ScopeName } from '@transcend-io/privacy-types';

import {
  TR_PULL_RESOURCE_SCOPE_MAP,
  TR_PUSH_RESOURCE_SCOPE_MAP,
} from '../transcend-yml/constants.js';

/**
 * Canonical domain MCP server identifiers (excludes docs, which uses no API scopes).
 * Single source of truth for {@link MCP_SERVER_OAUTH_SCOPES} and {@link TRANSCEND_MCP_SERVER_NPM_PACKAGES}.
 */
export enum TranscendMcpServer {
  Admin = 'admin',
  Assessment = 'assessment',
  Config = 'config',
  Consent = 'consent',
  CustomFunctions = 'customFunctions',
  Discovery = 'discovery',
  Dsr = 'dsr',
  Inventory = 'inventory',
  Policy = 'policy',
  Preferences = 'preferences',
  PrivacyCenter = 'privacyCenter',
  Workflows = 'workflows',
}

const CONFIG_OAUTH_SCOPES: ScopeName[] = [
  ...new Set([
    ...Object.values(TR_PULL_RESOURCE_SCOPE_MAP).flat(),
    ...Object.values(TR_PUSH_RESOURCE_SCOPE_MAP).flat(),
  ]),
].sort();

/**
 * OAuth scopes each domain MCP server requests at sign-in (offline_access added by base).
 */
export const MCP_SERVER_OAUTH_SCOPES: Record<TranscendMcpServer, readonly ScopeName[]> = {
  [TranscendMcpServer.Admin]: [
    ScopeName.ViewEmployees,
    ScopeName.ViewApiKeys,
    ScopeName.ManageApiKeys,
    ScopeName.ManageAccessControl,
  ],
  [TranscendMcpServer.Assessment]: [
    ScopeName.ViewAssessments,
    ScopeName.ViewAssignedAssessments,
    ScopeName.ManageAssessments,
    ScopeName.ManageAssignedAssessments,
  ],
  [TranscendMcpServer.Config]: CONFIG_OAUTH_SCOPES,
  [TranscendMcpServer.Consent]: [
    ScopeName.ViewConsentManager,
    ScopeName.ViewAssignedConsentManager,
    ScopeName.ManageConsentManager,
    ScopeName.ManageAssignedConsentManager,
    ScopeName.ViewDataFlow,
    ScopeName.ManageDataFlow,
    ScopeName.ViewManagedConsentDatabaseAdminApi,
    ScopeName.ManageConsentManagerDeveloperSettings,
    ScopeName.ViewPreferenceStoreSettings,
    ScopeName.ManagePreferenceStoreSettings,
  ],
  [TranscendMcpServer.CustomFunctions]: [
    ScopeName.ViewCustomFunction,
    ScopeName.ManageCustomFunction,
    ScopeName.ConnectDataSilos,
  ],
  [TranscendMcpServer.Discovery]: [
    ScopeName.ViewDataMap,
    ScopeName.ViewAssignedIntegrations,
    ScopeName.ViewCodeScanning,
    ScopeName.ManageCodeScanning,
    ScopeName.ViewPrompts,
    ScopeName.ViewPromptRuns,
    ScopeName.ExecutePrompt,
  ],
  [TranscendMcpServer.Dsr]: [
    ScopeName.ViewRequests,
    ScopeName.ViewAssignedRequests,
    ScopeName.MakeDataSubjectRequest,
    ScopeName.ManageAssignedRequests,
    ScopeName.ViewRequestCompilation,
    ScopeName.ManageRequestCompilation,
    ScopeName.ViewWorkflows,
    ScopeName.ViewRequestIdentitySettings,
    ScopeName.ManageRequestIdentities,
    ScopeName.ViewDataSubjectRequestSettings,
    ScopeName.ManageDataSubjectRequestSettings,
  ],
  [TranscendMcpServer.Inventory]: [
    ScopeName.ViewDataMap,
    ScopeName.ViewAssignedIntegrations,
    ScopeName.ManageDataMap,
    ScopeName.ManageAssignedIntegrations,
    ScopeName.ViewDataInventory,
    ScopeName.ViewAssignedDataInventory,
    ScopeName.ManageDataInventory,
    ScopeName.ManageAssignedDataInventory,
    ScopeName.ViewRequestIdentitySettings,
    ScopeName.ManageRequestIdentities,
    ScopeName.ViewDataSubjectRequestSettings,
    ScopeName.ManageDataSubjectRequestSettings,
    ScopeName.ViewGlobalAttributes,
    ScopeName.ManageGlobalAttributes,
  ],
  [TranscendMcpServer.Policy]: [ScopeName.ActivatePolicyEngineBundles],
  [TranscendMcpServer.Preferences]: [
    ScopeName.ViewManagedConsentDatabaseAdminApi,
    ScopeName.ManageStoredPreferences,
    ScopeName.ViewConsentManager,
    ScopeName.ManageConsentManagerDeveloperSettings,
    ScopeName.ViewPreferenceStoreSettings,
    ScopeName.ManagePreferenceStoreSettings,
    ScopeName.ViewDataSubjectRequestSettings,
    ScopeName.ViewDataMap,
    ScopeName.ManageWorkflows,
  ],
  [TranscendMcpServer.PrivacyCenter]: [
    ScopeName.ViewPrivacyCenter,
    ScopeName.ManagePrivacyCenter,
    ScopeName.ViewIntlMessages,
    ScopeName.ManageIntlMessages,
    ScopeName.ViewPolicies,
    ScopeName.ManagePolicies,
  ],
  [TranscendMcpServer.Workflows]: [
    ScopeName.ViewAllActionItems,
    ScopeName.ManageAllActionItems,
    ScopeName.ViewEmailTemplates,
    ScopeName.ManageEmailTemplates,
  ],
};

/** npm package name for each domain MCP server. */
export const TRANSCEND_MCP_SERVER_NPM_PACKAGES: Record<TranscendMcpServer, string> = {
  [TranscendMcpServer.Admin]: '@transcend-io/mcp-server-admin',
  [TranscendMcpServer.Assessment]: '@transcend-io/mcp-server-assessment',
  [TranscendMcpServer.Config]: '@transcend-io/mcp-server-config',
  [TranscendMcpServer.Consent]: '@transcend-io/mcp-server-consent',
  [TranscendMcpServer.CustomFunctions]: '@transcend-io/mcp-server-custom-functions',
  [TranscendMcpServer.Discovery]: '@transcend-io/mcp-server-discovery',
  [TranscendMcpServer.Dsr]: '@transcend-io/mcp-server-dsr',
  [TranscendMcpServer.Inventory]: '@transcend-io/mcp-server-inventory',
  [TranscendMcpServer.Policy]: '@transcend-io/mcp-server-policy',
  [TranscendMcpServer.Preferences]: '@transcend-io/mcp-server-preferences',
  [TranscendMcpServer.PrivacyCenter]: '@transcend-io/mcp-server-privacy-center',
  [TranscendMcpServer.Workflows]: '@transcend-io/mcp-server-workflows',
};

/**
 * OAuth scopes for a domain MCP server.
 */
export function getMcpServerOAuthScopes(server: TranscendMcpServer): readonly ScopeName[] {
  return MCP_SERVER_OAUTH_SCOPES[server];
}
