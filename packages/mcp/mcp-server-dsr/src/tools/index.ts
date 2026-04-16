import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-core';

import { createDsrAnalyzeTool } from './dsr_analyze.js';
import { createDsrCancelTool } from './dsr_cancel.js';
import { createDsrGetDetailsTool } from './dsr_get_details.js';
import { createDsrListTool } from './dsr_list.js';

export function getDSRTools(clients: ToolClients): ToolDefinition[] {
  return [
    createDsrListTool(clients),
    createDsrGetDetailsTool(clients),
    createDsrCancelTool(clients),
    createDsrAnalyzeTool(clients),
  ];
}
