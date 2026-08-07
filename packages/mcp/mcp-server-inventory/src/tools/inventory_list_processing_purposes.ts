import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { DefaultPurposeSubCategoryType } from '@transcend-io/privacy-types';

import type { InventoryMixin } from '../graphql.js';

export const ListProcessingPurposesSchema = z.object({
  text: z
    .string()
    .optional()
    .describe('Free-text search across processing purposes (GraphQL filterBy.text)'),
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
export type ListProcessingPurposesInput = z.infer<typeof ListProcessingPurposesSchema>;

export function createInventoryListProcessingPurposesTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_processing_purposes',
    description:
      'List processing purpose subcategories from the Processing Purposes table in Data Inventory. ' +
      `Empty subcategory names are normalized to "${DefaultPurposeSubCategoryType.Other}" to match write-tool defaults. ` +
      'Use these IDs when assigning silo-level purposes via inventory_update_data_silo, or match ' +
      '`purpose`/`name` pairs when assigning field-level purposes via inventory_update_or_create_data_point. ' +
      'Pass `text` to search. Paginate with `offset` until `hasNextPage` is false.',
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
