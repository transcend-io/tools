import {
  createListResult,
  defineTool,
  derivePageInfo,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { PURPOSES, type TranscendCliPurposesResponse } from '@transcend-io/sdk';

export const ListPurposesSchema = OffsetPaginationSchema;
export type ListPurposesInput = z.infer<typeof ListPurposesSchema>;

export function createConsentListPurposesTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_list_purposes',
    description: 'List all tracking purposes configured for consent management.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListPurposesSchema,
    handler: async ({ limit, offset }) => {
      const data = await clients.graphql.makeRequest<TranscendCliPurposesResponse>(PURPOSES, {
        first: limit,
        offset,
      });
      const { nodes, totalCount } = data.purposes;
      return createListResult(nodes, {
        totalCount,
        hasNextPage: derivePageInfo({ offset, nodeCount: nodes.length, totalCount }).hasNextPage,
      });
    },
  });
}
