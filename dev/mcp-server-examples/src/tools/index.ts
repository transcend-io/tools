import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createExampleConsequentialTool } from './consequential.js';
import { createExampleElicitationTool } from './elicitation.js';
import { createExampleHelloAppTool } from './hello_app.js';

export function getExampleTools(_clients?: ToolClients): ToolDefinition[] {
  return [
    createExampleHelloAppTool(),
    createExampleElicitationTool(),
    createExampleConsequentialTool(),
  ];
}
