import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const ListDataSubjectsSchema = z.object({});
export type ListDataSubjectsInput = z.infer<typeof ListDataSubjectsSchema>;

export function createInventoryListDataSubjectsTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_data_subjects',
    description:
      'List data subject types configured for the organization. Use `id` values with ' +
      'inventory_write_data_silo `dataSubjectBlockListIds` (IDs of subjects to *block* ' +
      'from the data system — inverse of an allowlist). Returns the full set (not paginated).',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListDataSubjectsSchema,
    handler: async () => {
      const result = await graphql.listDataSubjects();

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
