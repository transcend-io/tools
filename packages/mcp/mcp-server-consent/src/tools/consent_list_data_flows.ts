import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';
import { ConsentTrackerStatus, OrderDirection } from '@transcend-io/privacy-types';
import { DATA_FLOWS, type TranscendCliDataFlowsResponse } from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

const ConsentTrackerStatusEnum = z.nativeEnum(ConsentTrackerStatus);
const OrderDirectionEnum = z.nativeEnum(OrderDirection);

export const ListDataFlowsSchema = z.object({
  limit: z.number().min(1).max(200).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  status: ConsentTrackerStatusEnum.describe(
    'Filter by status: NEEDS_REVIEW (triage) or LIVE (approved)',
  ),
  is_junk: z.boolean().optional().describe('Filter by junk status'),
  show_zero_activity: z.boolean().optional().describe('Include items with zero activity'),
  text: z.string().optional().describe('Search text filter'),
  service: z.string().optional().describe('Filter by service name'),
  order_field: z
    .string()
    .optional()
    .describe('Field to sort by: value, createdAt, updatedAt, occurrences, service'),
  order_direction: OrderDirectionEnum.optional().describe('Sort direction: ASC or DESC'),
});
export type ListDataFlowsInput = z.infer<typeof ListDataFlowsSchema>;

export function createConsentListDataFlowsTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_list_data_flows',
    description:
      'List data flows (network requests) in your consent manager. ' +
      'Requires a status filter: NEEDS_REVIEW for triage backlog, LIVE for approved flows. ' +
      'Returns value (URL/host), service, tracking purposes, activity (occurrences), and more.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListDataFlowsSchema,
    handler: async ({
      limit,
      offset,
      status,
      is_junk,
      show_zero_activity,
      text,
      service,
      order_field,
      order_direction,
    }) => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const data = await clients.graphql.makeRequest<TranscendCliDataFlowsResponse>(DATA_FLOWS, {
        input: { airgapBundleId },
        first: limit,
        offset,
        filterBy: {
          status,
          ...(is_junk !== undefined ? { isJunk: is_junk } : {}),
          ...(show_zero_activity !== undefined ? { showZeroActivity: show_zero_activity } : {}),
          ...(text ? { text } : {}),
          ...(service ? { service } : {}),
        },
        ...(order_field && order_direction
          ? { orderBy: [{ field: order_field, direction: order_direction }] }
          : {}),
      });
      return createListResult(data.dataFlows.nodes, {
        totalCount: data.dataFlows.totalCount,
        hasNextPage: (offset ?? 0) + data.dataFlows.nodes.length < data.dataFlows.totalCount,
      });
    },
  });
}
