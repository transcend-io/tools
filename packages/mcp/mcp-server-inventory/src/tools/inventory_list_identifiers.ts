import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListIdentifiersSchema = OffsetPaginationSchema;
export type ListIdentifiersInput = z.infer<typeof ListIdentifiersSchema>;

export function createInventoryListIdentifiersTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_identifiers',
    description:
      'List identifier types (email, user ID, etc.) configured in your organization. ' +
      '`totalCount` is the full match count, not the size of this page.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListIdentifiersSchema,
    handler: async ({ limit, offset }) => {
      const result = await graphql.listIdentifiers({
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
