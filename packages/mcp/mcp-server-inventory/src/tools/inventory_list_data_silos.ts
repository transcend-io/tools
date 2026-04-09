import {
  createListResult,
  createToolResult,
  z,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';

const ListDataSilosSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});

export function createInventoryListDataSilosTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as InventoryMixin;
  return {
    name: 'inventory_list_data_silos',
    description:
      'List all data silos (data systems and integrations) in your organization. Note: API does not support cursor pagination (max ~100 results).',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListDataSilosSchema,
    handler: async (args) => {
      const { limit, cursor } = args as z.infer<typeof ListDataSilosSchema>;
      try {
        const result = await graphql.listDataSilos({
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
