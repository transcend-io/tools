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
  type: z.nativeEnum(CustomFunctionType).optional().describe('Filter by custom function type'),
  lifecycleState: z
    .nativeEnum(CustomFunctionLifecycleState)
    .optional()
    .describe('Filter by custom function lifecycle state'),
  dataSiloId: z.string().optional().describe('Filter DSR functions by linked data silo ID'),
  text: z
    .string()
    .optional()
    .describe(
      'Free-text search across custom functions. Pass the unique name from upsert to find a ' +
        'function you just created',
    ),
});
export type CustomFunctionsListInput = z.infer<typeof CustomFunctionsListSchema>;

export function createCustomFunctionsListTool(clients: ToolClients) {
  const graphql = clients.graphql as CustomFunctionsMixin;
  return defineTool({
    name: 'custom_functions_list',
    description:
      'List Custom Functions with lifecycle, gateway, data silo, active version, pending draft, ' +
      'and successfulTestRun metadata. Pass text with the unique name from upsert to find a ' +
      'function you just created. Omit sombraId on upsert unless this list (or an error) shows ' +
      'multiple gateways.',
    category: 'Custom Functions',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: CustomFunctionsListSchema,
    handler: async ({ type, lifecycleState, dataSiloId, text, first, offset }) => {
      const result = await graphql.listCustomFunctions({
        type,
        lifecycleState,
        dataSiloId,
        text,
        first,
        offset,
      });
      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.hasNextPage,
      });
    },
  });
}
