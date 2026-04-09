import {
  createListResult,
  createToolResult,
  PaginationSchema,
  type ToolClients,
  type ToolDefinition,
  z,
} from '@transcend-io/mcp-server-core';

import type { DSRMixin } from '../graphql.js';

export function createDsrListTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as DSRMixin;

  return {
    name: 'dsr_list',
    description:
      'List all Data Subject Requests. Use cursor pagination to retrieve all results (max 100 per page). Note: Server-side date filtering is not available - filter results client-side if needed.',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: PaginationSchema,
    handler: async (args) => {
      try {
        const result = await graphql.listRequests({
          first: args.limit,
          after: args.cursor,
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
