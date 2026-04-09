import {
  createListResult,
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { DSRMixin } from '../graphql.js';
import { ListDSRSchema } from '../schemas.js';

export function createDsrListTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as DSRMixin;

  return {
    name: 'dsr_list',
    description:
      'List all Data Subject Requests. Use cursor pagination to retrieve all results (max 100 per page). Note: Server-side date filtering is not available - filter results client-side if needed.',
    category: 'DSR Automation',
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
          description: 'Pagination cursor from previous response to fetch next page',
        },
      },
      required: [],
    },
    handler: async (args) => {
      const parsed = validateArgs(ListDSRSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.listRequests({
          first: parsed.data.limit,
          after: parsed.data.cursor,
        });

        return createListResult(result.nodes, {
          totalCount: result.totalCount,
          hasNextPage: result.pageInfo?.hasNextPage,
          cursor: result.pageInfo?.endCursor,
          paginationNote: result.pageInfo?.hasNextPage
            ? 'More results available. Pass the cursor value to fetch the next page.'
            : 'No more results.',
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
