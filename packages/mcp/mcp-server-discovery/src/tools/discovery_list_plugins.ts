import {
  createListResult,
  defineTool,
  PaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { DiscoveryMixin } from '../graphql.js';

export const ListPluginsSchema = PaginationSchema.omit({ cursor: true });
export type ListPluginsInput = z.infer<typeof ListPluginsSchema>;

export function createDiscoveryListPluginsTool(clients: ToolClients) {
  const graphql = clients.graphql as DiscoveryMixin;
  return defineTool({
    name: 'discovery_list_plugins',
    description: 'List all available discovery plugins (integration types) in your organization.',
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListPluginsSchema,
    handler: async ({ limit }) => {
      const result = await graphql.listDiscoveryPlugins({
        first: limit,
      });
      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
