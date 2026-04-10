import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';

export const UpdateDataSiloSchema = z.object({
  data_silo_id: z.string().describe('ID of the data silo to update'),
  title: z.string().optional().describe('New title for the data silo'),
  description: z.string().optional().describe('New description'),
});
export type UpdateDataSiloInput = z.infer<typeof UpdateDataSiloSchema>;

export function createInventoryUpdateDataSiloTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_update_data_silo',
    description: 'Update an existing data silo',
    category: 'Data Inventory',
    readOnly: false,
    confirmationHint: 'Updates the data silo configuration',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: UpdateDataSiloSchema,
    handler: async ({ data_silo_id, title, description }) => {
      const result = await graphql.updateDataSilo({
        id: data_silo_id,
        title,
        description,
      });
      return createToolResult(true, {
        dataSilo: result,
        message: 'Data silo updated successfully',
      });
    },
  });
}
