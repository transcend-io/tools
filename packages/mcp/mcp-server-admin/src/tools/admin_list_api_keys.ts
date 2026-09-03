import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AdminMixin } from '../graphql.js';

export const ListApiKeysSchema = OffsetPaginationSchema;
export type ListApiKeysInput = z.infer<typeof ListApiKeysSchema>;

export function createAdminListApiKeysTool(clients: ToolClients) {
  const graphql = clients.graphql as AdminMixin;
  return defineTool({
    name: 'admin_list_api_keys',
    description: 'List all API keys configured for your organization (tokens are not shown).',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListApiKeysSchema,
    handler: async ({ limit, offset }) => {
      const result = await graphql.listApiKeys({
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
