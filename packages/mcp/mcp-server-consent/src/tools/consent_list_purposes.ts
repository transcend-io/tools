import {
  createListResult,
  createToolResult,
  z,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { ConsentMixin } from '../graphql.js';

const PaginationSchema = z.object({
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe('Results per page (1-100, default: 50)'),
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor from previous response (where supported)'),
});

const ListPurposesSchema = PaginationSchema;

export function createConsentListPurposesTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as ConsentMixin;
  return {
    name: 'consent_list_purposes',
    description:
      'List all tracking purposes configured for consent management. Note: API does not support cursor pagination (max ~100 results).',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListPurposesSchema,
    handler: async (args) => {
      const { limit, cursor } = args as z.infer<typeof ListPurposesSchema>;
      try {
        const result = await graphql.listTrackingPurposes({
          first: limit,
          after: cursor,
        });
        return createListResult(result.nodes, {
          totalCount: result.totalCount,
          hasNextPage: result.pageInfo?.hasNextPage,
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}
