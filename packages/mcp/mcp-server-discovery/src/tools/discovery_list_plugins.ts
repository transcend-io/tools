import {
  createToolResult,
  createListResult,
  PaginationSchema,
  z,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { DiscoveryMixin } from '../graphql.js';

const ListPluginsSchema = PaginationSchema;

export function createDiscoveryListPluginsTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as DiscoveryMixin;
  return {
    name: 'discovery_list_plugins',
    description: 'List all available discovery plugins (integration types) in your organization.',
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListPluginsSchema,
    handler: async (rawArgs) => {
      const args = rawArgs as z.infer<typeof ListPluginsSchema>;
      try {
        const result = await graphql.listDiscoveryPlugins({
          first: args.limit,
          after: args.cursor,
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
