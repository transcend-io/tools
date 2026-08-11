import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListDataSilosSchema = z.object({
  text: z
    .string()
    .optional()
    .describe('Free-text search across data silos (GraphQL filterBy.text)'),
  titles: z.array(z.string()).optional().describe('Exact title matches (GraphQL filterBy.titles)'),
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
      'Pass `text` or `titles` to search/filter. Paginate with `offset` (increment by `limit`) ' +
      'until `hasNextPage` is false; `totalCount` is the full count.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListDataSilosSchema,
    handler: async ({ text, titles, limit, offset }) => {
      const result = await graphql.listDataSilos({
        first: limit,
        offset,
        text,
        titles,
      });

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
