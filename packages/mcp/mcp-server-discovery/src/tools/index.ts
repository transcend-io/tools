import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createDiscoveryClassifyTextTool } from './discovery_classify_text.js';
import { createDiscoveryListPluginsTool } from './discovery_list_plugins.js';
import { createDiscoveryListScansTool } from './discovery_list_scans.js';
import { createDiscoveryNerExtractTool } from './discovery_ner_extract.js';

export function getDiscoveryTools(clients: ToolClients): ToolDefinition[] {
  return [
    createDiscoveryClassifyTextTool(clients),
    createDiscoveryNerExtractTool(clients),
    createDiscoveryListScansTool(clients),
    createDiscoveryListPluginsTool(clients),
  ];
}
