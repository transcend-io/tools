import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-core';

import { createDiscoveryGetScanTool } from './discovery_get_scan.js';
import { createDiscoveryListPluginsTool } from './discovery_list_plugins.js';
import { createDiscoveryListScansTool } from './discovery_list_scans.js';
import { createDiscoveryStartScanTool } from './discovery_start_scan.js';

export function getDiscoveryTools(clients: ToolClients): ToolDefinition[] {
  return [
    createDiscoveryListScansTool(clients),
    createDiscoveryStartScanTool(clients),
    createDiscoveryGetScanTool(clients),
    createDiscoveryListPluginsTool(clients),
  ];
}
