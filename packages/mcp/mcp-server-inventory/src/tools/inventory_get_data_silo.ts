import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const GetDataSiloSchema = z.object({
  dataSiloId: z.string().describe('ID of the data silo to retrieve'),
});
export type GetDataSiloInput = z.infer<typeof GetDataSiloSchema>;

export function createInventoryGetDataSiloTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_get_data_silo',
    description:
      'Get detailed information about a specific data silo including its data points and identifiers',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetDataSiloSchema,
    handler: async ({ dataSiloId }) => {
      const result = await graphql.getDataSilo(dataSiloId);
      return createToolResult(true, result);
    },
  });
}
