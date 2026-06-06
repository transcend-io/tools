import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListVendorsSchema = z.object({
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe('Results per page (1-100, default: 50)'),
  offset: z.coerce
    .number()
    .min(0)
    .optional()
    .default(0)
    .describe('Number of results to skip for pagination (default: 0)'),
});
export type ListVendorsInput = z.infer<typeof ListVendorsSchema>;

export function createInventoryListVendorsTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_vendors',
    description:
      'List vendors (third-party data processors) in your organization. Paginate with `offset` (increment by `limit`) until `hasNextPage` is false; `totalCount` is the full count.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListVendorsSchema,
    handler: async ({ limit, offset }) => {
      const result = await graphql.listVendors({
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
