import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { DiscoveryMixin } from '../graphql.js';

export const ListScansSchema = OffsetPaginationSchema;
export type ListScansInput = z.infer<typeof ListScansSchema>;

export function createDiscoveryListScansTool(clients: ToolClients) {
  const graphql = clients.graphql as DiscoveryMixin;
  return defineTool({
    name: 'discovery_list_scans',
    description:
      'List data silos as classification scan records. Each row describes a silo rather than ' +
      'a real scan run, so `status` is not a live scan state; use `inventory_list_data_silos` ' +
      'when you want the silos themselves.',
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListScansSchema,
    handler: async ({ limit, offset }) => {
      const result = await graphql.listClassificationScans({
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
