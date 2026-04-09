import {
  createListResult,
  createToolResult,
  z,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';

const ListCategoriesSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});

export function createInventoryListCategoriesTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as InventoryMixin;
  return {
    name: 'inventory_list_categories',
    description:
      'List all data categories (PII types) configured in your organization. Note: API does not support cursor pagination (max ~100 results).',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListCategoriesSchema,
    handler: async (args) => {
      const { limit, cursor } = args as z.infer<typeof ListCategoriesSchema>;
      try {
        const result = await graphql.listDataCategories({
          first: limit,
          after: cursor,
        });

        return createListResult(result.nodes, {
          totalCount: result.totalCount,
          hasNextPage: result.pageInfo?.hasNextPage,
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}
