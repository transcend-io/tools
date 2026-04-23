import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListDataPointsSchema = z.object({
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
export type ListDataPointsInput = z.infer<typeof ListDataPointsSchema>;

export function createInventoryListDataPointsTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_data_points',
    description:
      'List data points (collections of personal data). Note: API does not support cursor pagination or data_silo filtering (max ~100 results).',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListDataPointsSchema,
    handler: async ({ limit, cursor }) => {
      const result = await graphql.listDataPoints(
        undefined, // dataSiloId not supported by API
        {
          first: limit,
          after: cursor,
        },
      );

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
