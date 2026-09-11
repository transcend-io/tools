import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListDataPointsSchema = OffsetPaginationSchema.extend({
  dataSiloId: z
    .string()
    .optional()
    .describe(
      'When set, only return datapoints belonging to this data silo ' +
        '(GraphQL filterBy.dataSilos). Strongly recommended for large inventories.',
    ),
  text: z
    .string()
    .optional()
    .describe('Free-text search across datapoints (GraphQL filterBy.text)'),
});
export type ListDataPointsInput = z.infer<typeof ListDataPointsSchema>;

export function createInventoryListDataPointsTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_data_points',
    description:
      'List data points (collections of personal data). Pass `dataSiloId` to scope to one ' +
      'data system (recommended) and/or `text` to search. Each row includes `dataSiloId`. ' +
      'For field-level purposes/categories, ' +
      'follow up with inventory_list_sub_data_points.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListDataPointsSchema,
    handler: async ({ dataSiloId, text, limit, offset }) => {
      const result = await graphql.listDataPoints(dataSiloId, {
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
