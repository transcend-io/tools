import {
  createToolResult,
  defineTool,
  EmptySchema,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AdminMixin } from '../graphql.js';

export function createAdminGetPrivacyCenterTool(clients: ToolClients) {
  const graphql = clients.graphql as AdminMixin;
  return defineTool({
    name: 'admin_get_privacy_center',
    description: 'Get privacy center configuration for your organization',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: EmptySchema,
    handler: async (_args) => {
      const result = await graphql.getPrivacyCenter();
      if (!result) {
        return createToolResult(true, {
          found: false,
          message: 'No privacy center configured for this organization',
        });
      }
      return createToolResult(true, { found: true, privacyCenter: result });
    },
  });
}
