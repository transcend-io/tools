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
  orderField: z
    .nativeEnum(CookieOrderField)
    .optional()
    .describe('Sort field. Omit for consent_cookie_triage_review_app fetches.'),
  orderDirection: z
    .nativeEnum(OrderDirection)
    .optional()
    .describe('Sort direction when orderField is set. Omit for triage app fetches.'),
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
      'Optional orderField/orderDirection and minOccurrences for ad-hoc listing. ' +
      'For consent_cookie_triage_review_app: fetch NEEDS_REVIEW with first: 100 (paginate via offset); ' +
      'omit order/purpose filters; project slim fields ' +
      '(name, id, service.title, trackingPurposes, occurrences, lastDiscoveredAt) before classifying.',

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
