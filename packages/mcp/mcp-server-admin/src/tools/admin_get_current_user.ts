import {
  createToolResult,
  z,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AdminMixin } from '../graphql.js';

const EmptySchema = z.object({});

export function createAdminGetCurrentUserTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AdminMixin;
  return {
    name: 'admin_get_current_user',
    description: 'Get information about the currently authenticated user (the API key owner)',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: EmptySchema,
    handler: async (_args) => {
      try {
        const result = await graphql.getCurrentUser();
        return createToolResult(true, result);
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
