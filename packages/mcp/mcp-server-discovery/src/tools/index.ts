import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createDiscoveryClassifyTextTool } from './discovery_classify_text.js';
import { createDiscoveryGetScanTool } from './discovery_get_scan.js';
import { createDiscoveryListPluginsTool } from './discovery_list_plugins.js';
import { createDiscoveryListScansTool } from './discovery_list_scans.js';
import { createDiscoveryNerExtractTool } from './discovery_ner_extract.js';
import { createDiscoveryStartScanTool } from './discovery_start_scan.js';

export function getDiscoveryTools(clients: ToolClients): ToolDefinition[] {
  return [
    createDiscoveryClassifyTextTool(clients),
    createDiscoveryNerExtractTool(clients),
    createDiscoveryListScansTool(clients),
    createDiscoveryStartScanTool(clients),
    createDiscoveryGetScanTool(clients),
    createDiscoveryListPluginsTool(clients),
  ];
}
