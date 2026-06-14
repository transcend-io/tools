import { ScopeName } from '@transcend-io/privacy-types';

/** OAuth scopes required for Inventory MCP tools (offline_access added by base). */
export const INVENTORY_OAUTH_SCOPES = [
  ScopeName.ViewDataMap,
  ScopeName.ManageDataMap,
  ScopeName.ViewDataInventory,
  ScopeName.ManageDataInventory,
] as const;
