import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListDataSilosSchema = z.object({
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
export type ListDataSilosInput = z.infer<typeof ListDataSilosSchema>;

export function createInventoryListDataSilosTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_data_silos',
    description:
      'List data silos (data systems and integrations) in your organization. ' +
      'Pass `text` or `titles` to search/filter, or `customSiloConnectionStrategy=CUSTOM_FUNCTION` ' +
      'to find silos that can host a DSR Custom Function. Each row includes connectionState and ' +
      'customSiloConnectionStrategy; call inventory_get_data_silo for sombraId. Paginate with ' +
      '`offset` (increment by `limit`) until `hasNextPage` is false; `totalCount` is the full count.',
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
