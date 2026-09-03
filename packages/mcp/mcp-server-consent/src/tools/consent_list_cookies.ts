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
  trackingPurposes: z
    .array(z.string())
    .min(1)
    .optional()
    .describe(
      'Filter to cookies assigned any of these tracking purpose slugs ' +
        '(e.g. ["Advertising", "Analytics"]). Use consent_list_purposes for valid slugs.',
    ),
  minOccurrences: z
    .number()
    .min(0)
    .optional()
    .describe('Only return cookies with at least this many occurrences (traffic)'),
  lastDiscoveredAtBefore: z
    .string()
    .optional()
    .describe(
      'ISO 8601 upper bound for lastDiscoveredAt (exclusive of newer activity). ' +
        'Use with first=1 to count dormant NEEDS_REVIEW cookies last seen before this time.',
    ),
  lastDiscoveredAtAfter: z
    .string()
    .optional()
    .describe('ISO 8601 lower bound for lastDiscoveredAt (cookies last seen on/after this time)'),
  orderField: z.nativeEnum(CookieOrderField).optional().describe('Sort field (e.g. occurrences).'),
  orderDirection: z
    .nativeEnum(OrderDirection)
    .optional()
    .describe('Sort direction when orderField is set.'),
});
export type ListCookiesInput = z.infer<typeof ListCookiesSchema>;

export function createConsentListCookiesTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_list_cookies',
    description:
      'List cookies in your consent manager. ' +
      'Requires status: NEEDS_REVIEW (triage) or LIVE (approved). ' +
      'Returns name, service, tracking purposes, occurrences, junk status, and more. ' +
      'Filter with trackingPurposes (slugs from consent_list_purposes). ' +
      'Optional lastDiscoveredAtBefore/After for last-seen windows, ' +
      'orderField/orderDirection and minOccurrences for ad-hoc listing. ' +
      'consent_cookie_triage_review_app pages NEEDS_REVIEW cookies via this tool when triageType is cookies.',

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
      trackingPurposes,
      minOccurrences,
      lastDiscoveredAtBefore,
      lastDiscoveredAtAfter,
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
          ...(trackingPurposes ? { trackingPurposes } : {}),
          ...(minOccurrences !== undefined ? { minOccurrences } : {}),
          ...(lastDiscoveredAtBefore ? { lastDiscoveredAtBefore } : {}),
          ...(lastDiscoveredAtAfter ? { lastDiscoveredAtAfter } : {}),
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
