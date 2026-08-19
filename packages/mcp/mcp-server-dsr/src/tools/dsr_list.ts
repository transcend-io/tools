import {
  createListResult,
  defineTool,
  PaginationSchema,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { DSRMixin } from '../graphql.js';

export function createDsrListTool(clients: ToolClients) {
  const graphql = clients.graphql as DSRMixin;

  return defineTool({
    name: 'dsr_list',
    description:
      'List Data Subject Requests with assigned owners and teams. Use cursor pagination to retrieve ' +
      'all results. Note: Server-side date filtering is not available — filter results client-side if ' +
      'needed. For per-system failures and system owners, use dsr_list_request_data_silos on a ' +
      'specific request.',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: PaginationSchema,
    handler: async ({ limit, cursor }) => {
      const result = await graphql.listRequests({
        first: limit,
        after: cursor,
      });

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
        cursor: result.pageInfo?.endCursor,
        paginationNote: result.pageInfo?.hasNextPage
          ? 'More results available. Pass the cursor value to fetch the next page.'
          : 'No more results.',
      });
    },
  });
}
