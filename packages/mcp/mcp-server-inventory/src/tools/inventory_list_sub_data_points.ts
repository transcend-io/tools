import {
  createListResult,
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';
import { ListSubDataPointsSchema } from '../schemas.js';

export function createInventoryListSubDataPointsTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as InventoryMixin;
  return {
    name: 'inventory_list_sub_data_points',
    description:
      'List sub-data points (individual data fields) for a specific data point. Note: This feature may have limited availability.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        data_point_id: {
          type: 'string',
          description: 'ID of the parent data point',
        },
        limit: {
          type: 'number',
          description: 'Results per page (1-100, default: 50)',
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip (default: 0)',
        },
      },
      required: ['data_point_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(ListSubDataPointsSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.listSubDataPoints(parsed.data.data_point_id, {
          first: parsed.data.limit,
          offset: parsed.data.offset,
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
