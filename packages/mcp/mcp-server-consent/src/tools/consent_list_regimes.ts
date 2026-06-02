import {
  createListResult,
  defineTool,
  listEnvelopeSchema,
  PrivacyRegimeSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { EXPERIENCES, type TranscendCliExperiencesResponse } from '@transcend-io/sdk';

export const ListRegimesSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});
export type ListRegimesInput = z.infer<typeof ListRegimesSchema>;

export function createConsentListRegimesTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_list_regimes',
    description:
      'List all consent experiences (regional regimes) configured for your organization. ' +
      'Returns experience name, regions, purposes, opted-out purposes, and view state.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListRegimesSchema,
    outputZodSchema: listEnvelopeSchema(PrivacyRegimeSchema),
    handler: async ({ limit, offset }) => {
      const data = await clients.graphql.makeRequest<TranscendCliExperiencesResponse>(EXPERIENCES, {
        first: limit,
        offset,
      });
      const { totalCount, nodes } = data.experiences;
      return createListResult(nodes, {
        totalCount,
        hasNextPage: offset + nodes.length < totalCount,
      });
    },
  });
}
