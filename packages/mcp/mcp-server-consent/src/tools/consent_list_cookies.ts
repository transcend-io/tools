import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import {
  ConsentTrackerStatus,
  CookieOrderField,
  OrderDirection,
} from '@transcend-io/privacy-types';
import { COOKIES, type TranscendCliCookiesResponse } from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const ListCookiesSchema = OffsetPaginationSchema.extend({
  status: z
    .nativeEnum(ConsentTrackerStatus)
    .describe('Filter by status: NEEDS_REVIEW (triage) or LIVE (approved)'),
  isJunk: z.boolean().optional().describe('Filter by junk status'),
  showZeroActivity: z
    .boolean()
    .optional()
    .describe(
      'Include items with zero activity. Omit (default) so the NEEDS_REVIEW total matches ' +
        'consent_get_inventory_stats cookies.needReviewCount; set true for the full triage ' +
        'backlog including never-active cookies.',
    ),
  text: z.string().optional().describe('Search text filter'),
  service: z.string().optional().describe('Filter by service name'),
  minOccurrences: z
    .number()
    .min(0)
    .optional()
    .describe('Only return cookies with at least this many occurrences (traffic)'),
  orderField: z
    .nativeEnum(CookieOrderField)
    .optional()
    .describe('Field to sort by (e.g. occurrences to rank by traffic)'),
  orderDirection: z.nativeEnum(OrderDirection).optional().describe('Sort direction: ASC or DESC'),
});
export type ListCookiesInput = z.infer<typeof ListCookiesSchema>;

export function createConsentListCookiesTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_list_cookies',
    description:
      'List cookies in your consent manager. ' +
      'Requires a status filter: NEEDS_REVIEW for triage backlog, LIVE for approved cookies. ' +
      'Returns name, service, tracking purposes, activity (occurrences), junk status, and more. ' +
      'Sort by occurrences (orderField=occurrences, orderDirection=DESC) to surface ' +
      'top-traffic cookies, and use minOccurrences to filter low-traffic noise.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListCookiesSchema,
    handler: async ({
      first,
      offset,
      status,
      isJunk,
      showZeroActivity,
      text,
      service,
      minOccurrences,
      orderField,
      orderDirection,
    }) => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const data = await clients.graphql.makeRequest<TranscendCliCookiesResponse>(COOKIES, {
        input: { airgapBundleId },
        first,
        offset,
        filterBy: {
          status,
          ...(isJunk !== undefined ? { isJunk } : {}),
          ...(showZeroActivity !== undefined ? { showZeroActivity } : {}),
          ...(text ? { text } : {}),
          ...(service ? { service } : {}),
          ...(minOccurrences !== undefined ? { minOccurrences } : {}),
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
