import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AdminMixin } from '../graphql.js';

export const ListTeamsSchema = OffsetPaginationSchema;
export type ListTeamsInput = z.infer<typeof ListTeamsSchema>;

export function createAdminListTeamsTool(clients: ToolClients) {
  const graphql = clients.graphql as AdminMixin;
  return defineTool({
    name: 'admin_list_teams',
    description: 'List all teams in your Transcend organization.',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListTeamsSchema,
    handler: async ({ limit, offset }) => {
      const result = await graphql.listTeams({
        first: limit,
        offset,
      });
      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
