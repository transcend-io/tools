import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListCategoriesSchema = z.object({
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
export type ListCategoriesInput = z.infer<typeof ListCategoriesSchema>;

export function createInventoryListCategoriesTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_categories',
    description:
      'List data categories (PII types) configured in your organization. Paginate with `offset` (increment by `limit`) until `hasNextPage` is false; `totalCount` is the full count.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListCategoriesSchema,
    handler: async ({ limit, offset }) => {
      const result = await graphql.listDataCategories({
        first: limit,
        offset,
      });

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
