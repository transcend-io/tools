import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const CreateDataSiloSchema = z.object({
  integrationName: z
    .string()
    .describe(
      'Catalog integration name (GraphQL `name`), e.g. "server", "salesforce", "stripe". ' +
        'Must match a Transcend catalog integrationName. When unknown, call ' +
        'inventory_list_catalog_integrations first (pass `text` to search).',
    ),
  title: z
    .string()
    .optional()
    .describe(
      'Display title for the data system. When omitted, the API may assign a default ' +
        '(e.g. "Server Webhook - created at …").',
    ),
  description: z.string().optional().describe('Description for the data system'),
});
export type CreateDataSiloInput = z.infer<typeof CreateDataSiloSchema>;

export function createInventoryCreateDataSiloTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_create_data_silo',
    description:
      'Create a new data silo (data system or integration). ' +
      'Use inventory_update_data_silo afterward for vendor, purposes, owners, and other metadata.',
    category: 'Data Inventory',
    readOnly: false,
    confirmationHint: 'Creates a new data silo in the inventory',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: CreateDataSiloSchema,
    handler: async ({ integrationName, title, description }) => {
      const result = await graphql.createDataSilo({
        name: integrationName,
        title,
        description,
      });
      return createToolResult(true, {
        dataSilo: result,
        message: `Data silo "${title ?? result.title}" created successfully`,
      });
    },
  });
}
