import {
  createToolResult,
  defineTool,
  EmptySchema,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AdminMixin } from '../graphql.js';

export function createAdminTestConnectionTool(clients: ToolClients) {
  const graphql = clients.graphql as AdminMixin;
  return defineTool({
    name: 'admin_test_connection',
    description: 'Test connectivity to the Transcend GraphQL API',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: EmptySchema,
    handler: async (_args) => {
      const connected = await graphql.testConnection();
      return createToolResult(true, {
        connected,
        details: {
          graphql: { connected, url: graphql.getBaseUrl() },
        },
        message: connected
          ? 'Successfully connected to Transcend GraphQL API'
          : 'GraphQL API connection failed - check details',
        timestamp: new Date().toISOString(),
      });
    },
  });
}
