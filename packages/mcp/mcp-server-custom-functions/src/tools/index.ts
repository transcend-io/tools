import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createCustomFunctionsGetCodeTool } from './custom_functions_get_code.js';
import { createCustomFunctionsListTool } from './custom_functions_list.js';

export function getCustomFunctionsTools(clients: ToolClients): ToolDefinition[] {
  return [createCustomFunctionsListTool(clients), createCustomFunctionsGetCodeTool(clients)];
}
