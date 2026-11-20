import { ScopeName } from '@transcend-io/privacy-types';

/** OAuth scopes required for Inventory MCP tools (offline_access added by base). */
export const INVENTORY_OAUTH_SCOPES = [
  ScopeName.ViewDataMap,
  ScopeName.ViewAssignedIntegrations,
  ScopeName.ManageDataMap,
  ScopeName.ManageAssignedIntegrations,
  ScopeName.ViewDataInventory,
  ScopeName.ViewAssignedDataInventory,
  ScopeName.ManageDataInventory,
  ScopeName.ManageAssignedDataInventory,
  // Processing activities, identifiers, data subjects, and custom fields
  // (TR_PULL_RESOURCE_SCOPE_MAP and TR_PUSH_RESOURCE_SCOPE_MAP in the SDK).
  ScopeName.ViewRequestIdentitySettings,
  ScopeName.ManageRequestIdentities,
  ScopeName.ViewDataSubjectRequestSettings,
  ScopeName.ManageDataSubjectRequestSettings,
  ScopeName.ViewGlobalAttributes,
  ScopeName.ManageGlobalAttributes,
] as const;
