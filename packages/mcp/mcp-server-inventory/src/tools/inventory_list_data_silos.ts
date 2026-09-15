import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListDataSilosSchema = OffsetPaginationSchema.extend({
  text: z
    .string()
    .optional()
    .describe('Free-text search across data silos (GraphQL filterBy.text)'),
  titles: z.array(z.string()).optional().describe('Exact title matches (GraphQL filterBy.titles)'),
  customSiloConnectionStrategy: z
    .enum(['WEBHOOK', 'CUSTOM_FUNCTION'])
    .optional()
    .describe(
      'Filter by connection strategy. Use CUSTOM_FUNCTION to list silos eligible for DSR Custom Functions',
    ),
});
export type ListDataSilosInput = z.infer<typeof ListDataSilosSchema>;

export function createInventoryListDataSilosTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_data_silos',
    description:
      'List data silos (data systems and integrations) in your organization. ' +
      'Pass `text` or `titles` to search/filter, or `customSiloConnectionStrategy=CUSTOM_FUNCTION` ' +
      'to find silos that can host a DSR Custom Function. Each row includes connectionState and ' +
      'customSiloConnectionStrategy; call inventory_get_data_silo for sombraId. `totalCount` is the ' +
      'full match count, not the size of this page.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListDataSilosSchema,
    handler: async ({ text, titles, customSiloConnectionStrategy, limit, offset }) => {
      const result = await graphql.listDataSilos({
        first: limit,
        offset,
        text,
        titles,
        customSiloConnectionStrategy,
      });

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
