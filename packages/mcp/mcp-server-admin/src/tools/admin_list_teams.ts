import {
  createListResult,
  createToolResult,
  z,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AdminMixin } from '../graphql.js';

const ListTeamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});

export function createAdminListTeamsTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AdminMixin;
  return {
    name: 'admin_list_teams',
    description:
      'List all teams in your Transcend organization. Note: API does not support cursor pagination (max ~100 results).',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListTeamsSchema,
    handler: async (args) => {
      const { limit, cursor } = args as z.infer<typeof ListTeamsSchema>;
      try {
        const result = await graphql.listTeams({
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
  };
}
