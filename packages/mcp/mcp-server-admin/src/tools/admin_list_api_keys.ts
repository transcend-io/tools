import {
  createListResult,
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AdminMixin } from '../graphql.js';
import { ListApiKeysSchema } from '../schemas.js';

export function createAdminListApiKeysTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AdminMixin;
  return {
    name: 'admin_list_api_keys',
    description:
      'List all API keys configured for your organization (tokens are not shown). Note: API does not support cursor pagination (max ~100 results).',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Results per page (1-100, default: 50)' },
        cursor: {
          type: 'string',
          description: 'Pagination cursor from previous response (where supported)',
        },
        offset: { type: 'number', description: 'Number of results to skip (default: 0)' },
      },
      required: [],
    },
    handler: async (args) => {
      const parsed = validateArgs(ListApiKeysSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.listApiKeys({
          first: parsed.data.limit,
          offset: parsed.data.offset,
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
