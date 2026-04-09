import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

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

export const ListAirgapBundlesSchema = PaginationSchema;
export type ListAirgapBundlesInput = z.infer<typeof ListAirgapBundlesSchema>;

export function createConsentListAirgapBundlesTool(clients: ToolClients) {
  const graphql = clients.graphql as ConsentMixin;
  return defineTool({
    name: 'consent_list_airgap_bundles',
    description:
      'List all consent manager UI bundles (Airgap bundles) configured in your organization.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListAirgapBundlesSchema,
    handler: async ({ limit, cursor }) => {
      const result = await graphql.listAirgapBundles({
        first: limit,
        after: cursor,
      });
      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
