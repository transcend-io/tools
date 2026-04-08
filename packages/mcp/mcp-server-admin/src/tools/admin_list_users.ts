import {
  createListResult,
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AdminMixin } from '../graphql.js';
import { ListUsersSchema } from '../schemas.js';

export function createAdminListUsersTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AdminMixin;
  return {
    name: 'admin_list_users',
    description:
      'List all users in your Transcend organization. Note: API does not support cursor pagination (max ~100 results).',
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
      },
      required: [],
    },
    handler: async (args) => {
      const parsed = validateArgs(ListUsersSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.listUsers({
          first: parsed.data.limit,
          after: parsed.data.cursor,
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
