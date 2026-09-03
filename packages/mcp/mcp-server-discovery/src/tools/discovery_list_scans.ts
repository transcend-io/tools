import {
  createListResult,
  defineTool,
  PaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { DiscoveryMixin } from '../graphql.js';

export const ListScansSchema = PaginationSchema.omit({ cursor: true });
export type ListScansInput = z.infer<typeof ListScansSchema>;

export function createDiscoveryListScansTool(clients: ToolClients) {
  const graphql = clients.graphql as DiscoveryMixin;
  return defineTool({
    name: 'discovery_list_scans',
    description: 'List all data classification scans. Returns data silos with classification info.',
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListScansSchema,
    handler: async ({ limit }) => {
      const result = await graphql.listClassificationScans({
        first: limit,
      });
      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
