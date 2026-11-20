import type { ToolClients, ToolDefinition } from '@transcend-io/mcp-server-base';

import { createConfigGetSchemaTool } from './tools/config_get_schema.js';
import { createConfigPullTool } from './tools/config_pull.js';
import { createConfigPushTool } from './tools/config_push.js';

export function getConfigTools(clients: ToolClients): ToolDefinition[] {
  return [
    createConfigPullTool(clients),
    createConfigPushTool(clients),
    createConfigGetSchemaTool(clients),
  ];
}

export { ConfigGetSchemaSchema, type ConfigGetSchemaInput } from './tools/config_get_schema.js';
export { ConfigPullSchema, type ConfigPullInput } from './tools/config_pull.js';
export { ConfigPushSchema, type ConfigPushInput } from './tools/config_push.js';
