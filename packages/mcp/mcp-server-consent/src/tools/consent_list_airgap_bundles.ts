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

const ListAirgapBundlesSchema = PaginationSchema;

export function createConsentListAirgapBundlesTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as ConsentMixin;
  return {
    name: 'consent_list_airgap_bundles',
    description:
      'List all consent manager UI bundles (Airgap bundles) configured in your organization.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListAirgapBundlesSchema,
    handler: async (args) => {
      const { limit, cursor } = args as z.infer<typeof ListAirgapBundlesSchema>;
      try {
        const result = await graphql.listAirgapBundles({
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
