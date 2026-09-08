import {
  createListResult,
  defineTool,
  CursorPaginationSchema,
  type ToolClients,
  z,
} from '@transcend-io/mcp-server-base';

import type { DSRMixin } from '../graphql.js';

export const listRequestsSchema = CursorPaginationSchema.extend({
  identifierValue: z
    .string()
    .optional()
    .describe(
      'Fuzzy/exact search across request identifiers (email, phone, etc.). ' +
        'Prefer this for looking up DSRs by email or phone. Maps to admin ' +
        '"Identifier Value (Fuzzy)".',
    ),
  emails: z
    .array(z.string())
    .optional()
    .describe(
      'Exact match on primary email address only. Does not search phone ' +
        'or other identifiers — use identifierValue for those.',
    ),
});
export type ListRequestsInput = z.infer<typeof listRequestsSchema>;

export function createDsrListTool(clients: ToolClients) {
  const graphql = clients.graphql as DSRMixin;

  return defineTool({
    name: 'dsr_list',
    description:
      'List Data Subject Requests with assigned owners and teams. ' +
      'Filter by identifierValue to look up requests by email or phone (fuzzy/exact across ' +
      'request identifiers, same as admin "Identifier Value (Fuzzy)"). ' +
      'Use emails only for exact match on primary email address. ' +
      'Note: Server-side date filtering is not available — filter results client-side if ' +
      'needed. For per-system failures and system ' +
      'owners, use dsr_list_request_data_silos on a specific request.',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: listRequestsSchema,
    handler: async ({ limit, cursor, identifierValue, emails }) => {
      const result = await graphql.listRequests({
        first: limit,
        after: cursor,
        identifierValue,
        emails,
      });

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
        cursor: result.pageInfo?.endCursor,
        paginationNote: result.pageInfo?.hasNextPage
          ? 'More results available. Pass the cursor value to fetch the next page.'
          : 'No more results.',
      });
    },
  });
}
