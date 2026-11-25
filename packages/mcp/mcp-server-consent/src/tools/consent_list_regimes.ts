import {
  createListResult,
  defineTool,
  derivePageInfo,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { EXPERIENCES, type TranscendCliExperiencesResponse } from '@transcend-io/sdk';

export const ListRegimesSchema = OffsetPaginationSchema;
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
    handler: async ({ limit, offset }) => {
      const data = await clients.graphql.makeRequest<TranscendCliExperiencesResponse>(EXPERIENCES, {
        first: limit,
        offset,
      });
      const { totalCount } = data.experiences;
      // `experiences` returns `first + 1` rows, so honour `limit` here rather
      // than handing callers a page one row longer than they asked for. Paging
      // stays gapless because the extra row is the one the next offset starts on.
      const nodes = data.experiences.nodes.slice(0, limit);
      return createListResult(nodes, {
        totalCount,
        hasNextPage: derivePageInfo({ offset, nodeCount: nodes.length, totalCount }).hasNextPage,
      });
    },
  });
}
