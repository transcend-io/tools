import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { AdminMixin } from '../graphql.js';

export const ListTeamsSchema = z.object({
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe('Results per page (1-100, default: 50)'),
});
export type ListTeamsInput = z.infer<typeof ListTeamsSchema>;

export function createAdminListTeamsTool(clients: ToolClients) {
  const graphql = clients.graphql as AdminMixin;
  return defineTool({
    name: 'admin_list_teams',
    description:
      'List all teams in your Transcend organization. Returns at most `limit` rows (max 100).',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListTeamsSchema,
    handler: async ({ limit }) => {
      const result = await graphql.listTeams({
        first: limit,
      });
      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
