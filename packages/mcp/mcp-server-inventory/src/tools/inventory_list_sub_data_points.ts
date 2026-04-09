import {
  createListResult,
  createToolResult,
  z,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';

const ListSubDataPointsSchema = z.object({
  data_point_id: z.string(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export function createInventoryListSubDataPointsTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as InventoryMixin;
  return {
    name: 'inventory_list_sub_data_points',
    description:
      'List sub-data points (individual data fields) for a specific data point. Note: This feature may have limited availability.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListSubDataPointsSchema,
    handler: async (args) => {
      const { data_point_id, limit, offset } = args as z.infer<typeof ListSubDataPointsSchema>;
      try {
        const result = await graphql.listSubDataPoints(data_point_id, {
          first: limit,
          offset,
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
