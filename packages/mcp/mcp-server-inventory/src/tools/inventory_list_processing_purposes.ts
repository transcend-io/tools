import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { DefaultPurposeSubCategoryType } from '@transcend-io/privacy-types';

import type { InventoryMixin } from '../graphql.js';

export const ListProcessingPurposesSchema = OffsetPaginationSchema.extend({
  text: z
    .string()
    .optional()
    .describe('Free-text search across processing purposes (GraphQL filterBy.text)'),
});
export type ListProcessingPurposesInput = z.infer<typeof ListProcessingPurposesSchema>;

export function createInventoryListProcessingPurposesTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_processing_purposes',
    description:
      'List processing purpose subcategories from the Processing Purposes table in Data Inventory. ' +
      `Empty subcategory names are normalized to "${DefaultPurposeSubCategoryType.Other}" to match write-tool defaults. ` +
      'Use these IDs when assigning silo-level purposes via inventory_write_data_silo, or match ' +
      '`purpose`/`name` pairs when assigning field-level purposes via inventory_update_or_create_data_point.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListProcessingPurposesSchema,
    handler: async ({ text, limit, offset }) => {
      const result = await graphql.listProcessingPurposes({
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
