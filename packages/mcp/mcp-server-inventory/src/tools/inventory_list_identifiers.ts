import {
  createListResult,
  createToolResult,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';

const ListIdentifiersSchema = z.object({
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe('Results per page (1-100, default: 50)'),
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor from previous response (where supported)'),
});

export function createInventoryListIdentifiersTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_identifiers',
    description:
      'List all identifier types (email, user ID, etc.) configured in your organization. Note: API does not support cursor pagination (max ~100 results).',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListIdentifiersSchema,
    handler: async ({ limit, cursor }) => {
      try {
        const result = await graphql.listIdentifiers({
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
