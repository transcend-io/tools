import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';

const CreateDataSiloSchema = z.object({
  title: z
    .string()
    .describe(
      'Name/title of the data silo (must match an integrationName in the Transcend catalog, e.g. "Salesforce", "Stripe")',
    ),
});

export function createInventoryCreateDataSiloTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_create_data_silo',
    description:
      'Create a new data silo (data system or integration). The name must match an integration name from the Transcend catalog.',
    category: 'Data Inventory',
    readOnly: false,
    confirmationHint: 'Creates a new data silo in the inventory',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: CreateDataSiloSchema,
    handler: async ({ title }) => {
      const result = await graphql.createDataSilo({
        name: title,
      });
      return createToolResult(true, {
        dataSilo: result,
        message: `Data silo "${title}" created successfully`,
      });
    },
  });
}
