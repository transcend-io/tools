import {
  createListResult,
  defineTool,
  derivePageInfo,
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
      'Include zero-activity cookies. Omit so NEEDS_REVIEW totals match ' +
        'consent_get_inventory_stats; set true for the full never-active backlog.',
    ),
  text: z.string().optional().describe('Search text filter'),
  service: z.string().optional().describe('Filter by service name'),
  trackingPurposes: z
    .array(z.string())
    .min(1)
    .optional()
    .describe('Purpose slugs from consent_list_purposes (e.g. Advertising).'),
  minOccurrences: z.number().min(0).optional().describe('Minimum occurrence (traffic) count.'),
  lastDiscoveredAtBefore: z
    .string()
    .optional()
    .describe('ISO 8601 upper bound on lastDiscoveredAt.'),
  lastDiscoveredAtAfter: z
    .string()
    .optional()
    .describe('ISO 8601 lower bound on lastDiscoveredAt.'),
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
      'Returns name, service, purposes, occurrences, junk status. ' +
      'Filter via trackingPurposes, lastDiscoveredAtBefore/After, minOccurrences, orderField.',

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
        first: limit,
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
          ? {
              orderBy: [
                { field: orderField, direction: orderDirection },
                // Stable tie-breaker so offset pages don't overlap when
                // many rows share the same occurrences value.
                ...(orderField === CookieOrderField.Occurrences
                  ? [{ field: CookieOrderField.Name, direction: OrderDirection.Asc }]
                  : []),
              ],
            }
          : {}),
      });
      const { nodes, totalCount } = data.cookies;
      return createListResult(nodes, {
        totalCount,
        hasNextPage: derivePageInfo({ offset, nodeCount: nodes.length, totalCount }).hasNextPage,
      });
    },
  });
}
