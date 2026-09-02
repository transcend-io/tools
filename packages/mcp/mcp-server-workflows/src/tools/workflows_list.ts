import {
  createListResult,
  defineTool,
  PaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { WorkflowsMixin } from '../graphql.js';

export const ListWorkflowsSchema = PaginationSchema.extend({
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor from previous response (where supported)'),
});
export type ListWorkflowsInput = z.infer<typeof ListWorkflowsSchema>;

export function createWorkflowsListTool(clients: ToolClients) {
  const graphql = clients.graphql as WorkflowsMixin;
  return defineTool({
    name: 'workflows_list',
    description:
      'List workflow configs in your organization. Use each returned `id` as `workflowConfigId` ' +
      'for `dsr_submit`. Results include `actionType` and `subjectType` so you can pick ACCESS vs ' +
      'ERASURE (and subject class) without guessing. Note: API does not support cursor pagination ' +
      '(max ~100 results).',
    category: 'Workflows',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListWorkflowsSchema,
    handler: async ({ limit, cursor }) => {
      const result = await graphql.listWorkflows({
        first: limit,
        after: cursor,
      });

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
