import {
  createToolResult,
  z,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { DiscoveryMixin } from '../graphql.js';

const StartScanSchema = z.object({
  name: z.string(),
  data_silo_id: z.string().optional(),
  type: z.string().optional(),
});

export function createDiscoveryStartScanTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as DiscoveryMixin;
  return {
    name: 'discovery_start_scan',
    description: 'Start a new data classification scan on a data silo.',
    category: 'Data Discovery',
    readOnly: false,
    confirmationHint: 'Starts a new classification scan on the data silo',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: StartScanSchema,
    handler: async (rawArgs) => {
      const args = rawArgs as z.infer<typeof StartScanSchema>;
      try {
        const result = await graphql.startClassificationScan({
          name: args.name,
          dataSiloId: args.data_silo_id,
          type: args.type,
        });
        return createToolResult(true, {
          scan: result,
          message: `Classification scan "${args.name}" started successfully`,
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}
