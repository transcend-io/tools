import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createExampleElicitationTool } from './elicitation.js';
import { createExampleHelloAppTool } from './hello_app.js';

export function getExampleTools(_clients?: ToolClients): ToolDefinition[] {
  return [createExampleHelloAppTool(), createExampleElicitationTool()];
}
