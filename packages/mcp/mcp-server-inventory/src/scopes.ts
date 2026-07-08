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
] as const;
