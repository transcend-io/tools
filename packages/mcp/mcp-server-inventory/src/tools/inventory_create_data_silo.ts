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
  sombraId: z
    .string()
    .optional()
    .describe(
      'Sombra gateway ID. Required when integrationName is customFunction (DSR Custom Function integrations must be pinned to a dedicated Sombra). Reuse sombraId from custom_functions_list or inventory_get_data_silo.',
    ),
});
export type CreateDataSiloInput = z.infer<typeof CreateDataSiloSchema>;

export function createInventoryCreateDataSiloTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_create_data_silo',
    description:
      'Create a new data silo (data system or integration). ' +
      'For a DSR Custom Function integration, pass integrationName "customFunction" and sombraId; ' +
      'custom_functions_upsert can also create that silo when dataSiloId is omitted. ' +
      'Use inventory_update_data_silo afterward for vendor, purposes, owners, and other metadata.',
    category: 'Data Inventory',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: CreateDataSiloSchema,
    handler: async ({ integrationName, title, description, sombraId }) => {
      const result = await graphql.createDataSilo({
        name: integrationName,
        title,
        description,
        sombraId,
      });
      return createToolResult(true, {
        dataSilo: result,
        message: `Data silo "${title ?? result.title}" created successfully`,
      });
    },
  });
}
