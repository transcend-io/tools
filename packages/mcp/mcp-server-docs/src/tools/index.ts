import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createDocsFetchTool } from './docs_fetch.js';
import { createDocsIntegrationLookupTool } from './docs_integration_lookup.js';
import { createDocsListTool } from './docs_list.js';

export function getDocsTools(clients: ToolClients): ToolDefinition[] {
  return [createDocsListTool(), createDocsFetchTool(), createDocsIntegrationLookupTool(clients)];
}
