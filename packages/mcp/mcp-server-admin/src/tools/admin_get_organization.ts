import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AdminMixin } from '../graphql.js';
import { EmptySchema } from '../schemas.js';

export function createAdminGetOrganizationTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AdminMixin;
  return {
    name: 'admin_get_organization',
    description: 'Get information about your Transcend organization',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async (args) => {
      const parsed = validateArgs(EmptySchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.getOrganization();
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
