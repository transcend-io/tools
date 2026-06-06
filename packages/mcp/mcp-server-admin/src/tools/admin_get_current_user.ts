import {
  createToolResult,
  defineTool,
  EmptySchema,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AdminMixin } from '../graphql.js';

export function createAdminGetCurrentUserTool(clients: ToolClients) {
  const graphql = clients.graphql as AdminMixin;
  return defineTool({
    name: 'admin_get_current_user',
    description: 'Get information about the currently authenticated user (the API key owner)',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: EmptySchema,
    handler: async (_args) => {
      const result = await graphql.getCurrentUser();
      return createToolResult(true, result);
    },
  });
}
