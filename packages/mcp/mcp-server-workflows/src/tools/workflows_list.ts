import {
  createListResult,
  createToolResult,
  defineTool,
  PaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { WorkflowsMixin } from '../graphql.js';

const ListWorkflowsSchema = PaginationSchema.extend({
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor from previous response (where supported)'),
});

export function createWorkflowsListTool(clients: ToolClients) {
  const graphql = clients.graphql as WorkflowsMixin;
  return defineTool({
    name: 'workflows_list',
    description:
      'List all workflows configured in your organization. Note: API does not support cursor pagination (max ~100 results).',
    category: 'Workflows',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListWorkflowsSchema,
    handler: async ({ limit, cursor }) => {
      try {
        const result = await graphql.listWorkflows({
          first: limit,
          after: cursor,
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
  });
}
