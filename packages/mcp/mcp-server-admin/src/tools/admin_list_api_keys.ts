import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { AdminMixin } from '../graphql.js';

const ListApiKeysSchema = z.object({
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
  offset: z.coerce
    .number()
    .min(0)
    .optional()
    .default(0)
    .describe('Number of results to skip (default: 0)'),
});

export function createAdminListApiKeysTool(clients: ToolClients) {
  const graphql = clients.graphql as AdminMixin;
  return defineTool({
    name: 'admin_list_api_keys',
    description:
      'List all API keys configured for your organization (tokens are not shown). Note: API does not support cursor pagination (max ~100 results).',
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
