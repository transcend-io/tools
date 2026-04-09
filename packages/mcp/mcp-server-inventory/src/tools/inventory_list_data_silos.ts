import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';

const ListDataSilosSchema = z.object({
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe('Results per page (1-100, default: 50)'),
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor from previous response (where supported)'),
});

export function createInventoryListDataSilosTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_data_silos',
    description:
      'List all data silos (data systems and integrations) in your organization. Note: API does not support cursor pagination (max ~100 results).',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListDataSilosSchema,
    handler: async ({ limit, cursor }) => {
      const result = await graphql.listDataSilos({
        first: limit,
        after: cursor,
      });

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
