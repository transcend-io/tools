import type { ToolClients, ToolDefinition } from '@transcend-io/mcp-server-base';

import { createConfigDiffTool } from './tools/config_diff.js';
import { createConfigGetSchemaTool } from './tools/config_get_schema.js';
import { createConfigPreviewPushTool } from './tools/config_preview_push.js';
import { createConfigPullTool } from './tools/config_pull.js';
import { createConfigPushTool } from './tools/config_push.js';

export function getConfigTools(clients: ToolClients): ToolDefinition[] {
  return [
    createConfigPullTool(clients),
    createConfigDiffTool(clients),
    createConfigPushTool(clients),
    createConfigPreviewPushTool(clients),
    createConfigGetSchemaTool(clients),
  ];
}

export { ConfigGetSchemaSchema, type ConfigGetSchemaInput } from './tools/config_get_schema.js';
export { ConfigDiffSchema, type ConfigDiffInput } from './tools/config_diff.js';
export { ConfigPullSchema, type ConfigPullInput } from './tools/config_pull.js';
export {
  ConfigPreviewPushSchema,
  type ConfigPreviewPushInput,
} from './tools/config_preview_push.js';
export { ConfigPushSchema, type ConfigPushInput } from './tools/config_push.js';
