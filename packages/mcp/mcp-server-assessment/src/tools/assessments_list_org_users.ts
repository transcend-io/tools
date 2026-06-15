import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';

/** Same schema as admin_list_users — exposed for the assignee picker MCP App on assessment servers. */
export const ListOrgUsersSchema = z.object({
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe('Results per page (1-100, default: 50)'),
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor from previous response (where supported)'),
});
export type ListOrgUsersInput = z.infer<typeof ListOrgUsersSchema>;

export function createAssessmentsListOrgUsersTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'admin_list_users',
    description:
      'List all users in your Transcend organization. Note: API does not support cursor pagination (max ~100 results).',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListOrgUsersSchema,
    handler: async ({ limit, cursor }) => {
      const result = await graphql.listUsers({
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
