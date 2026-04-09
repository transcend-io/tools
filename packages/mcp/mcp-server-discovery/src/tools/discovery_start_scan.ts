import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { DiscoveryMixin } from '../graphql.js';

const StartScanSchema = z.object({
  name: z.string(),
  data_silo_id: z.string().optional(),
  type: z.string().optional(),
});

export function createDiscoveryStartScanTool(clients: ToolClients) {
  const graphql = clients.graphql as DiscoveryMixin;
  return defineTool({
    name: 'discovery_start_scan',
    description: 'Start a new data classification scan on a data silo.',
    category: 'Data Discovery',
    readOnly: false,
    confirmationHint: 'Starts a new classification scan on the data silo',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: StartScanSchema,
    handler: async ({ name, data_silo_id, type }) => {
      try {
        const result = await graphql.startClassificationScan({
          name,
          dataSiloId: data_silo_id,
          type,
        });
        return createToolResult(true, {
          scan: result,
          message: `Classification scan "${name}" started successfully`,
        });
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
