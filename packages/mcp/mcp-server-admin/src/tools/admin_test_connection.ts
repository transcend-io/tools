import {
  createToolResult,
  defineTool,
  EmptySchema,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AdminMixin } from '../graphql.js';

export function createAdminTestConnectionTool(clients: ToolClients) {
  const { rest } = clients;
  const graphql = clients.graphql as AdminMixin;
  return defineTool({
    name: 'admin_test_connection',
    description: 'Test connectivity to both Transcend REST and GraphQL APIs',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: EmptySchema,
    handler: async (_args) => {
      try {
        const [graphqlConnected, restConnected] = await Promise.all([
          graphql.testConnection(),
          rest.testConnection(),
        ]);
        const allConnected = graphqlConnected && restConnected;
        return createToolResult(true, {
          connected: allConnected,
          details: {
            graphql: { connected: graphqlConnected, url: graphql.getBaseUrl() },
            rest: { connected: restConnected, url: rest.getBaseUrl() },
          },
          message: allConnected
            ? 'Successfully connected to all Transcend APIs'
            : 'Some API connections failed - check details',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });
}
