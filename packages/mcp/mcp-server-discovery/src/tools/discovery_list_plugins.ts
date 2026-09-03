import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { DiscoveryMixin } from '../graphql.js';

export const ListPluginsSchema = OffsetPaginationSchema;
export type ListPluginsInput = z.infer<typeof ListPluginsSchema>;

export function createDiscoveryListPluginsTool(clients: ToolClients) {
  const graphql = clients.graphql as DiscoveryMixin;
  return defineTool({
    name: 'discovery_list_plugins',
    description:
      'List the integration types in use in your organization, derived from the distinct ' +
      'types of the data silos on this page. Because the set is derived per page rather ' +
      'than queried directly, union the results across pages for a complete list.',
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListPluginsSchema,
    handler: async ({ limit, offset }) => {
      const result = await graphql.listDiscoveryPlugins({
        first: limit,
        offset,
      });
      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
