import {
  createListResult,
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';
import { ListDataSilosSchema } from '../schemas.js';

export function createInventoryListDataSilosTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as InventoryMixin;
  return {
    name: 'inventory_list_data_silos',
    description:
      'List all data silos (data systems and integrations) in your organization. Note: API does not support cursor pagination (max ~100 results).',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Results per page (1-100, default: 50)',
        },
        cursor: {
          type: 'string',
          description: 'Pagination cursor from previous response (where supported)',
        },
      },
      required: [],
    },
    handler: async (args) => {
      const parsed = validateArgs(ListDataSilosSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.listDataSilos({
          first: parsed.data.limit,
          after: parsed.data.cursor,
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
