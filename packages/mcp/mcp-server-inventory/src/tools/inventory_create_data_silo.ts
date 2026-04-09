import {
  createToolResult,
  z,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';

const CreateDataSiloSchema = z.object({
  title: z.string(),
});

export function createInventoryCreateDataSiloTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as InventoryMixin;
  return {
    name: 'inventory_create_data_silo',
    description:
      'Create a new data silo (data system or integration). The name must match an integration name from the Transcend catalog.',
    category: 'Data Inventory',
    readOnly: false,
    confirmationHint: 'Creates a new data silo in the inventory',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: CreateDataSiloSchema,
    handler: async (args) => {
      const { title } = args as z.infer<typeof CreateDataSiloSchema>;
      try {
        const result = await graphql.createDataSilo({
          name: title,
        });
        return createToolResult(true, {
          dataSilo: result,
          message: `Data silo "${title}" created successfully`,
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
