import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListVendorsSchema = OffsetPaginationSchema.extend({
  text: z.string().optional().describe('Free-text search across vendors (GraphQL filterBy.text)'),
});
export type ListVendorsInput = z.infer<typeof ListVendorsSchema>;

export function createInventoryListVendorsTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_vendors',
    description:
      'List vendors (third-party data processors) with contact, website, DPA link, address, ' +
      'and headquarters fields. Pass `text` to search. `totalCount` is the full match ' +
      'count, not the size of this page.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListVendorsSchema,
    handler: async ({ text, limit, offset }) => {
      const result = await graphql.listVendors({
        first: limit,
        offset,
        text,
      });

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
