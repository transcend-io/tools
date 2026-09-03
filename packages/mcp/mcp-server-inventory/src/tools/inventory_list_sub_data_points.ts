import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { DefaultPurposeSubCategoryType } from '@transcend-io/privacy-types';

import type { InventoryMixin } from '../graphql.js';

export const ListSubDataPointsSchema = OffsetPaginationSchema.extend({
  dataPointId: z.string().describe('ID of the parent data point'),
});
export type ListSubDataPointsInput = z.infer<typeof ListSubDataPointsSchema>;

export function createInventoryListSubDataPointsTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_sub_data_points',
    description:
      'List sub-data points (individual data fields) for a specific data point, including ' +
      'purpose of processing and data category assignments. Empty subcategory names are ' +
      `normalized to "${DefaultPurposeSubCategoryType.Other}".`,
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListSubDataPointsSchema,
    handler: async ({ dataPointId, limit, offset }) => {
      const result = await graphql.listSubDataPoints(dataPointId, {
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
