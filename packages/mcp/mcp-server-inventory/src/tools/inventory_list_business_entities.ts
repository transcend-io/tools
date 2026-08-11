import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListBusinessEntitiesSchema = z.object({
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
export type ListBusinessEntitiesInput = z.infer<typeof ListBusinessEntitiesSchema>;

export function createInventoryListBusinessEntitiesTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_business_entities',
    description:
      'List business entities from Data Inventory. Use `title` values with ' +
      'inventory_update_data_silo `businessEntityTitles`. Paginate with `offset` until ' +
      '`hasNextPage` is false.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListBusinessEntitiesSchema,
    handler: async ({ limit, offset }) => {
      const result = await graphql.listBusinessEntities({
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
