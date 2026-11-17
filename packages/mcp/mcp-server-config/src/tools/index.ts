import type { ToolClients, ToolDefinition } from '@transcend-io/mcp-server-base';

import { createConfigGetSchemaTool } from './config_get_schema.js';
import { createConfigPullTool } from './config_pull.js';
import { createConfigPushTool } from './config_push.js';

export function getConfigTools(clients: ToolClients): ToolDefinition[] {
  return [
    createConfigPullTool(clients),
    createConfigPushTool(clients),
    createConfigGetSchemaTool(clients),
  ];
}
