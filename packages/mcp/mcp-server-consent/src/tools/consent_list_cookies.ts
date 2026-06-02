import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  ConsentTrackerStatus,
  CookieOrderField,
  OrderDirection,
} from '@transcend-io/privacy-types';
import { COOKIES, type TranscendCliCookiesResponse } from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const ListCookiesSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(200)
    .optional()
    .default(50)
    .describe('Maximum number of cookies to return per page (1-200, default 50).'),
  offset: z
    .number()
    .min(0)
    .optional()
    .default(0)
    .describe('Number of results to skip for pagination (default 0).'),
  status: z
    .nativeEnum(ConsentTrackerStatus)
    .describe('Filter by status: NEEDS_REVIEW (triage) or LIVE (approved)'),
  isJunk: z.boolean().optional().describe('Filter by junk status'),
  showZeroActivity: z.boolean().optional().describe('Include items with zero activity'),
  text: z.string().optional().describe('Search text filter'),
  service: z.string().optional().describe('Filter by service name'),
  orderField: z.nativeEnum(CookieOrderField).optional().describe('Field to sort by'),
  orderDirection: z.nativeEnum(OrderDirection).optional().describe('Sort direction: ASC or DESC'),
});
export type ListCookiesInput = z.infer<typeof ListCookiesSchema>;

export function createConsentListCookiesTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_list_cookies',
    description:
      'List cookies in your consent manager. ' +
      'Requires a status filter: NEEDS_REVIEW for triage backlog, LIVE for approved cookies. ' +
      'Returns name, service, tracking purposes, activity (occurrences), junk status, and more.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListCookiesSchema,
    handler: async ({
      limit,
      offset,
      status,
      isJunk,
      showZeroActivity,
      text,
      service,
      orderField,
      orderDirection,
    }) => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const data = await clients.graphql.makeRequest<TranscendCliCookiesResponse>(COOKIES, {
        input: { airgapBundleId },
        first: limit,
        offset,
        filterBy: {
          status,
          ...(isJunk !== undefined ? { isJunk } : {}),
          ...(showZeroActivity !== undefined ? { showZeroActivity } : {}),
          ...(text ? { text } : {}),
          ...(service ? { service } : {}),
        },
        ...(orderField && orderDirection
          ? { orderBy: [{ field: orderField, direction: orderDirection }] }
          : {}),
      });
      const { nodes, totalCount } = data.cookies;
      return createListResult(nodes, {
        totalCount,
        hasNextPage: offset + nodes.length < totalCount,
      });
    },
  });
}
