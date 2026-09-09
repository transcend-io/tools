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
  DataFlowOrderField,
  DataFlowScope,
  OrderDirection,
} from '@transcend-io/privacy-types';
import { DATA_FLOWS, type TranscendCliDataFlowsResponse } from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const ListDataFlowsSchema = OffsetPaginationSchema.extend({
  status: z
    .nativeEnum(ConsentTrackerStatus)
    .describe('Filter by status: NEEDS_REVIEW (triage) or LIVE (approved)'),
  isJunk: z.boolean().optional().describe('Filter by junk status'),
  showZeroActivity: z
    .boolean()
    .optional()
    .describe(
      'Include zero-activity flows. Omit so NEEDS_REVIEW totals match ' +
        'consent_get_inventory_stats; set true for the full never-active backlog.',
    ),
  text: z.string().optional().describe('Search text filter'),
  service: z.string().optional().describe('Filter by service name'),
  unmappedOnly: z
    .boolean()
    .optional()
    .describe('Only unmapped flows (no service). Useful with status=LIVE for approved orphans.'),
  type: z
    .nativeEnum(DataFlowScope)
    .optional()
    .describe('Filter by data flow scope type (e.g. HOST, PATH, REGEX, CSP)'),
  trackingTypes: z
    .array(z.string())
    .min(1)
    .optional()
    .describe(
      'Filter by tracking purpose slugs (e.g. ["Advertising"]). Use consent_list_purposes.',
    ),
  minOccurrences: z
    .number()
    .min(0)
    .optional()
    .describe('Only return flows with at least this many occurrences (traffic)'),
  lastDiscoveredAtBefore: z
    .string()
    .optional()
    .describe(
      'ISO 8601 upper bound for lastDiscoveredAt. Use with first=1 to count dormant items.',
    ),
  lastDiscoveredAtAfter: z
    .string()
    .optional()
    .describe('ISO 8601 lower bound for lastDiscoveredAt'),
  orderField: z.nativeEnum(DataFlowOrderField).optional().describe('Field to sort by'),
  orderDirection: z.nativeEnum(OrderDirection).optional().describe('Sort direction: ASC or DESC'),
});
export type ListDataFlowsInput = z.infer<typeof ListDataFlowsSchema>;

export function createConsentListDataFlowsTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_list_data_flows',
    description:
      'List data flows (network requests) in your consent manager. ' +
      'Requires status: NEEDS_REVIEW (triage) or LIVE (approved). ' +
      'Returns value (URL/host), service, tracking purposes, occurrences, and more. ' +
      'Filter with unmappedOnly, type, trackingTypes (slugs from consent_list_purposes), ' +
      'minOccurrences, and lastDiscoveredAtBefore/After.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListDataFlowsSchema,
    handler: async ({
      limit,
      offset,
      status,
      isJunk,
      showZeroActivity,
      text,
      service,
      unmappedOnly,
      type,
      trackingTypes,
      minOccurrences,
      lastDiscoveredAtBefore,
      lastDiscoveredAtAfter,
      orderField,
      orderDirection,
    }) => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const data = await clients.graphql.makeRequest<TranscendCliDataFlowsResponse>(DATA_FLOWS, {
        input: { airgapBundleId },
        first: limit,
        offset,
        filterBy: {
          status,
          ...(isJunk !== undefined ? { isJunk } : {}),
          ...(showZeroActivity !== undefined ? { showZeroActivity } : {}),
          ...(text ? { text } : {}),
          // An empty-string service maps to `catalogIntegrationName IS NULL`
          // server-side, so unmappedOnly takes precedence over a named service filter.
          ...(unmappedOnly ? { service: '' } : service ? { service } : {}),
          ...(type ? { type } : {}),
          ...(trackingTypes ? { trackingTypes } : {}),
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
                ...(orderField === DataFlowOrderField.Occurrences
                  ? [{ field: DataFlowOrderField.Value, direction: OrderDirection.Asc }]
                  : []),
              ],
            }
          : {}),
      });
      const { nodes, totalCount } = data.dataFlows;
      return createListResult(nodes, {
        totalCount,
        hasNextPage: derivePageInfo({ offset, nodeCount: nodes.length, totalCount }).hasNextPage,
      });
    },
  });
}
