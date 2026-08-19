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
      'Get detailed information about a specific data silo (Data Systems row): vendor link, ' +
      'silo-level processing purposes, owners, teams, business entities, data subjects ' +
      '(allowlist + blocklist), contact/website/notes metadata, identifiers, connectionState, ' +
      'customSiloConnectionStrategy, and sombraId. DSR Custom Functions require CUSTOM_FUNCTION ' +
      'strategy and a sombraId. Use before inventory_update_data_silo to avoid overwriting ' +
      'existing assignments. For datapoints on this silo, call inventory_list_data_points with dataSiloId.',
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
