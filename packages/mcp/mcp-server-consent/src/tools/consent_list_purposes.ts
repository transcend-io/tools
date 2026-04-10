import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';
import { PURPOSES, type TranscendCliPurposesResponse } from '@transcend-io/sdk';

export const ListPurposesSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});
export type ListPurposesInput = z.infer<typeof ListPurposesSchema>;

export function createConsentListPurposesTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_list_purposes',
    description: 'List all tracking purposes configured for consent management (max ~100 results).',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListPurposesSchema,
    handler: async ({ limit }) => {
      const data = await clients.graphql.makeRequest<TranscendCliPurposesResponse>(PURPOSES, {
        first: Math.min(limit, 100),
      });
      const { nodes, totalCount } = data.purposes;
      return createListResult(nodes, {
        totalCount,
        hasNextPage: nodes.length < totalCount,
      });
    },
  });
}
