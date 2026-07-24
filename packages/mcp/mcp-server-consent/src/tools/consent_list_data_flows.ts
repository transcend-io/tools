import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  ConsentTrackerStatus,
  DataFlowOrderField,
  DataFlowScope,
  OrderDirection,
} from '@transcend-io/privacy-types';
import { DATA_FLOWS, type TranscendCliDataFlowsResponse } from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const ListDataFlowsSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(200)
    .optional()
    .default(50)
    .describe('Maximum number of data flows to return per page (1-200, default 50).'),
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
  showZeroActivity: z
    .boolean()
    .optional()
    .describe(
      'Include items with zero activity. Omit (default) so the NEEDS_REVIEW total matches ' +
        'consent_get_inventory_stats needReviewCount; set true for the full triage backlog ' +
        'including never-active flows.',
    ),
  text: z.string().optional().describe('Search text filter'),
  service: z.string().optional().describe('Filter by service name'),
  unmappedOnly: z
    .boolean()
    .optional()
    .describe(
      'Return only unmapped/orphaned flows with no associated service (catalog integration). ' +
        'Useful with status=LIVE to find approved flows that are not mapped to a service.',
    ),
  type: z
    .nativeEnum(DataFlowScope)
    .optional()
    .describe('Filter by data flow scope type (e.g. HOST, PATH, REGEX, CSP)'),
  minOccurrences: z
    .number()
    .min(0)
    .optional()
    .describe('Only return flows with at least this many occurrences (traffic)'),
  orderField: z.nativeEnum(DataFlowOrderField).optional().describe('Field to sort by'),
  orderDirection: z.nativeEnum(OrderDirection).optional().describe('Sort direction: ASC or DESC'),
});
export type ListDataFlowsInput = z.infer<typeof ListDataFlowsSchema>;

export function createConsentListDataFlowsTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_list_data_flows',
    description:
      'List data flows (network requests) in your consent manager. ' +
      'Requires a status filter: NEEDS_REVIEW for triage backlog, LIVE for approved flows. ' +
      'Returns value (URL/host), service, tracking purposes, activity (occurrences), and more. ' +
      'Use unmappedOnly to find approved flows with no service, type to filter by scope ' +
      '(e.g. CSP), and minOccurrences to focus on high-traffic flows.',
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
      minOccurrences,
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
          ...(minOccurrences !== undefined ? { minOccurrences } : {}),
        },
        ...(orderField && orderDirection
          ? { orderBy: [{ field: orderField, direction: orderDirection }] }
          : {}),
      });
      const { nodes, totalCount } = data.dataFlows;
      return createListResult(nodes, {
        totalCount,
        hasNextPage: offset + nodes.length < totalCount,
      });
    },
  });
}
