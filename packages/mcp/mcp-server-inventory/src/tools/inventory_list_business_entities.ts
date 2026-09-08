import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListBusinessEntitiesSchema = OffsetPaginationSchema;
export type ListBusinessEntitiesInput = z.infer<typeof ListBusinessEntitiesSchema>;

export function createInventoryListBusinessEntitiesTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_business_entities',
    description:
      'List business entities from Data Inventory. Use `title` values with ' +
      'inventory_write_data_silo `businessEntityTitles`.',
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
