import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createDocsFetchTool } from './docs_fetch.js';
import { createDocsListTool } from './docs_list.js';

export function getDocsTools(_clients?: ToolClients): ToolDefinition[] {
  return [createDocsListTool(), createDocsFetchTool()];
}
