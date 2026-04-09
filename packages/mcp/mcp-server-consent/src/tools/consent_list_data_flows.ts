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

const ListDataFlowsSchema = PaginationSchema;

export function createConsentListDataFlowsTool(clients: ToolClients) {
  const graphql = clients.graphql as ConsentMixin;
  return defineTool({
    name: 'consent_list_data_flows',
    description:
      'List all data flows (tracking data flows/purposes) configured in your organization.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListDataFlowsSchema,
    handler: async ({ limit, cursor }) => {
      const result = await graphql.listDataFlows({
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
