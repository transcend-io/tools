import {
  createToolResult,
  z,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';

const UpdateDataSiloSchema = z.object({
  data_silo_id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
});

export function createInventoryUpdateDataSiloTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as InventoryMixin;
  return {
    name: 'inventory_update_data_silo',
    description: 'Update an existing data silo',
    category: 'Data Inventory',
    readOnly: false,
    confirmationHint: 'Updates the data silo configuration',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: UpdateDataSiloSchema,
    handler: async (args) => {
      const { data_silo_id, title, description } = args as z.infer<typeof UpdateDataSiloSchema>;
      try {
        const result = await graphql.updateDataSilo({
          id: data_silo_id,
          title,
          description,
        });
        return createToolResult(true, {
          dataSilo: result,
          message: 'Data silo updated successfully',
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
