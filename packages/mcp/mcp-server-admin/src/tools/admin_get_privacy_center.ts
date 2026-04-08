import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AdminMixin } from '../graphql.js';
import { EmptySchema } from '../schemas.js';

export function createAdminGetPrivacyCenterTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AdminMixin;
  return {
    name: 'admin_get_privacy_center',
    description: 'Get privacy center configuration for your organization',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async (args) => {
      const parsed = validateArgs(EmptySchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.getPrivacyCenter();
        if (!result) {
          return createToolResult(true, {
            found: false,
            message: 'No privacy center configured for this organization',
          });
        }
        return createToolResult(true, { found: true, privacyCenter: result });
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
