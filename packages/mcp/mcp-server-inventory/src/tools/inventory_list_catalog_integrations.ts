import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListCatalogIntegrationsSchema = z.object({
  text: z
    .string()
    .optional()
    .describe('Free-text search across catalog title and integrationName (GraphQL filterBy.text)'),
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe('Results per page (1-100, default: 50)'),
  offset: z.coerce
    .number()
    .min(0)
    .optional()
    .default(0)
    .describe('Number of results to skip for pagination (default: 0)'),
});
export type ListCatalogIntegrationsInput = z.infer<typeof ListCatalogIntegrationsSchema>;

export function createInventoryListCatalogIntegrationsTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_catalog_integrations',
    description:
      'Search the Transcend integration catalog for valid `integrationName` values to pass to ' +
      'inventory_create_data_silo. Pass `text` to match title or integrationName (e.g. "salesforce"). ' +
      'Paginate with `offset` until `hasNextPage` is false; `totalCount` is the full count.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListCatalogIntegrationsSchema,
    handler: async ({ text, limit, offset }) => {
      const result = await graphql.listCatalogs({
        first: limit,
        offset,
        text,
      });

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
