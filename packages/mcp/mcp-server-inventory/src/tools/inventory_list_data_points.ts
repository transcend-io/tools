import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListDataPointsSchema = z.object({
  dataSiloId: z
    .string()
    .optional()
    .describe(
      'When set, only return datapoints belonging to this data silo ' +
        '(GraphQL filterBy.dataSilos). Strongly recommended for large inventories.',
    ),
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
export type ListDataPointsInput = z.infer<typeof ListDataPointsSchema>;

export function createInventoryListDataPointsTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_data_points',
    description:
      'List data points (collections of personal data). Pass `dataSiloId` to scope to one ' +
      'data system (recommended). Each row includes `dataSiloId`. Paginate with `offset` ' +
      'until `hasNextPage` is false. For field-level purposes/categories, follow up with ' +
      'inventory_list_sub_data_points.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListDataPointsSchema,
    handler: async ({ dataSiloId, limit, offset }) => {
      const result = await graphql.listDataPoints(dataSiloId, {
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
