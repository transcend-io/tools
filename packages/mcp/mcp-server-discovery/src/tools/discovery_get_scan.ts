import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { DiscoveryMixin } from '../graphql.js';

const GetScanSchema = z.object({
  scan_id: z.string(),
});

export function createDiscoveryGetScanTool(clients: ToolClients) {
  const graphql = clients.graphql as DiscoveryMixin;
  return defineTool({
    name: 'discovery_get_scan',
    description: 'Get detailed information about a specific classification scan including results.',
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetScanSchema,
    handler: async ({ scan_id }) => {
      try {
        const result = await graphql.getClassificationScan(scan_id);
        return createToolResult(true, result);
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });
}
