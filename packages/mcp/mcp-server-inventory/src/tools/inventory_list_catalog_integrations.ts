import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListCatalogIntegrationsSchema = OffsetPaginationSchema.extend({
  text: z
    .string()
    .optional()
    .describe('Free-text search across catalog title and integrationName (GraphQL filterBy.text)'),
});
export type ListCatalogIntegrationsInput = z.infer<typeof ListCatalogIntegrationsSchema>;

export function createInventoryListCatalogIntegrationsTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_catalog_integrations',
    description:
      'Search the Transcend integration catalog for valid `integrationName` values to pass to ' +
      'inventory_write_data_silo. Pass `text` to match title or integrationName (e.g. "salesforce"). ' +
      '`totalCount` is the full match count, not the size of this page.',
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
