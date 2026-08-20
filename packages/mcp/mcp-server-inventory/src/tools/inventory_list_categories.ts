import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  type ToolClients,
  z,
} from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListCategoriesSchema = OffsetPaginationSchema.extend({
  text: z
    .string()
    .optional()
    .describe(
      'Free-text search (GraphQL filterBy.text). This is a HAVING search over subcategory name, ' +
        'attributes, and matching DataCategoryType labels — not a simple ILIKE on name/description/category.',
    ),
});
export type ListCategoriesInput = z.infer<typeof ListCategoriesSchema>;

export function createInventoryListCategoriesTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_categories',
    description:
      'List data category subcategories (PII types) from the Data Categories table. ' +
      'Each row includes `id`, `name`, `category`, and optional `description`. ' +
      'Optional `text` is a HAVING search over name, attributes, and DataCategoryType labels. ' +
      'Paginate with `offset` (increment by `first`) until `hasNextPage` is false. Use these IDs or ' +
      'name+category pairs when assigning field-level categories via inventory_update_or_create_data_point.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListCategoriesSchema,
    handler: async ({ text, first, offset }) => {
      const result = await graphql.listDataCategories({
        first,
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
