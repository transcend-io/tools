import {
  createToolResult,
  createListResult,
  defineTool,
  PaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { DiscoveryMixin } from '../graphql.js';

const ListScansSchema = PaginationSchema;

export function createDiscoveryListScansTool(clients: ToolClients) {
  const graphql = clients.graphql as DiscoveryMixin;
  return defineTool({
    name: 'discovery_list_scans',
    description: 'List all data classification scans. Returns data silos with classification info.',
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListScansSchema,
    handler: async ({ limit, cursor }) => {
      try {
        const result = await graphql.listClassificationScans({
          first: limit,
          after: cursor,
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
  });
}
