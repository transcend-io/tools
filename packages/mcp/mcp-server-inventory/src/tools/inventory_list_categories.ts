import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListCategoriesSchema = z.object({
  text: z
    .string()
    .optional()
    .describe('Free-text search across data categories (GraphQL filterBy.text)'),
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
      'List data category subcategories (PII types) from the Data Categories table. ' +
      'Each row includes `id`, `name`, `category`, and optional `description`. ' +
      'Paginate with `offset` until `hasNextPage` is false. Use these IDs or name+category ' +
      'pairs when assigning field-level categories via inventory_update_or_create_data_point.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListCategoriesSchema,
    handler: async ({ text, limit, offset }) => {
      const result = await graphql.listDataCategories({
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
