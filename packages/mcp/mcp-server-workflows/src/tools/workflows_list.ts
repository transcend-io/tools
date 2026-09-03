import {
  createListResult,
  defineTool,
  PaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { WorkflowsMixin } from '../graphql.js';

export const ListWorkflowsSchema = PaginationSchema.omit({ cursor: true });
export type ListWorkflowsInput = z.infer<typeof ListWorkflowsSchema>;

export function createWorkflowsListTool(clients: ToolClients) {
  const graphql = clients.graphql as WorkflowsMixin;
  return defineTool({
    name: 'workflows_list',
    description:
      'List workflow configs in your organization. Use each returned `id` as `workflowConfigId` ' +
      'for `dsr_submit`. Results include `actionType` and `subjectType` so you can pick ACCESS vs ' +
      'ERASURE (and subject class) without guessing. Returns at most `limit` rows (max 100).',
    category: 'Workflows',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListWorkflowsSchema,
    handler: async ({ limit }) => {
      const result = await graphql.listWorkflows({
        first: limit,
      });

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
