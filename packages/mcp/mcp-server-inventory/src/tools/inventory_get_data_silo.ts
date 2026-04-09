import {
  createToolResult,
  z,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';

const GetDataSiloSchema = z.object({
  data_silo_id: z.string(),
});

export function createInventoryGetDataSiloTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as InventoryMixin;
  return {
    name: 'inventory_get_data_silo',
    description:
      'Get detailed information about a specific data silo including its data points and identifiers',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetDataSiloSchema,
    handler: async (args) => {
      const { data_silo_id } = args as z.infer<typeof GetDataSiloSchema>;
      try {
        const result = await graphql.getDataSilo(data_silo_id);
        return createToolResult(true, result);
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
