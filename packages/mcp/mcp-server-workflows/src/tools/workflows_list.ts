import {
  createListResult,
  createToolResult,
  PaginationSchema,
  z,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { WorkflowsMixin } from '../graphql.js';

const ListWorkflowsSchema = PaginationSchema;

export function createWorkflowsListTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as WorkflowsMixin;
  return {
    name: 'workflows_list',
    description:
      'List all workflows configured in your organization. Note: API does not support cursor pagination (max ~100 results).',
    category: 'Workflows',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListWorkflowsSchema,
    handler: async (rawArgs) => {
      const args = rawArgs as z.infer<typeof ListWorkflowsSchema>;
      try {
        const result = await graphql.listWorkflows({
          first: args.limit,
          after: args.cursor,
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
