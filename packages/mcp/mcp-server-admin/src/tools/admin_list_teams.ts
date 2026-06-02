import {
  createListResult,
  defineTool,
  listEnvelopeSchema,
  TeamSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AdminMixin } from '../graphql.js';

export const ListTeamsSchema = z.object({
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
export type ListTeamsInput = z.infer<typeof ListTeamsSchema>;

export function createAdminListTeamsTool(clients: ToolClients) {
  const graphql = clients.graphql as AdminMixin;
  return defineTool({
    name: 'admin_list_teams',
    description:
      'List all teams in your Transcend organization. Note: API does not support cursor pagination (max ~100 results).',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListTeamsSchema,
    outputZodSchema: listEnvelopeSchema(TeamSchema),
    handler: async ({ limit, cursor }) => {
      const result = await graphql.listTeams({
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
