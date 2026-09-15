import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { CustomFunctionLifecycleState, CustomFunctionType } from '@transcend-io/privacy-types';

import type { CustomFunctionsMixin } from '../graphql.js';

export const CustomFunctionsListSchema = OffsetPaginationSchema.extend({
  type: z.nativeEnum(CustomFunctionType).optional().describe('Filter by type'),
  lifecycleState: z
    .nativeEnum(CustomFunctionLifecycleState)
    .optional()
    .describe('Filter by lifecycle state'),
  dataSiloId: z.string().optional().describe('Filter DSR functions by data silo ID'),
  text: z.string().optional().describe('Free-text search (use the unique name from upsert)'),
});
export type CustomFunctionsListInput = z.infer<typeof CustomFunctionsListSchema>;

export function createCustomFunctionsListTool(clients: ToolClients) {
  const graphql = clients.graphql as CustomFunctionsMixin;
  return defineTool({
    name: 'custom_functions_list',
    description:
      'List Custom Functions (lifecycle, gateway, silo, versions, successfulTestRun). ' +
      'Search with text; use results to decide whether upsert needs sombraId.',
    category: 'Custom Functions',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: CustomFunctionsListSchema,
    handler: async ({ type, lifecycleState, dataSiloId, text, limit, offset }) => {
      const result = await graphql.listCustomFunctions({
        type,
        lifecycleState,
        dataSiloId,
        text,
        first: limit,
        offset,
      });
      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.hasNextPage,
      });
    },
  });
}
