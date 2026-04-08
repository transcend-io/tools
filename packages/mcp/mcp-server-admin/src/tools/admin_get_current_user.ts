import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AdminMixin } from '../graphql.js';
import { EmptySchema } from '../schemas.js';

export function createAdminGetCurrentUserTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AdminMixin;
  return {
    name: 'admin_get_current_user',
    description: 'Get information about the currently authenticated user (the API key owner)',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async (args) => {
      const parsed = validateArgs(EmptySchema, args);
      if (!parsed.success) return parsed.error;
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
