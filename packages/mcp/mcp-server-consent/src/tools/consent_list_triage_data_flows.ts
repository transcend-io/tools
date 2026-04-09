import {
  createListResult,
  createToolResult,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-core';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';

import type { ConsentMixin } from '../graphql.js';

const ConsentTrackerStatusEnum = z.nativeEnum(ConsentTrackerStatus);
const OrderDirectionEnum = z.enum(['ASC', 'DESC']);

const ListTriageDataFlowsSchema = z.object({
  airgap_bundle_id: z.string().describe('Airgap bundle ID (from consent_list_airgap_bundles)'),
  limit: z
    .number()
    .min(1)
    .max(200)
    .optional()
    .default(50)
    .describe('Results per page (1-200, default: 50)'),
  offset: z.number().min(0).optional().default(0).describe('Offset for pagination (default: 0)'),
  status: ConsentTrackerStatusEnum.optional().describe(
    'Filter by status: NEEDS_REVIEW (triage) or LIVE (approved)',
  ),
  is_junk: z.boolean().optional().describe('Filter by junk status'),
  show_zero_activity: z
    .boolean()
    .optional()
    .describe('Include items with zero activity (default: false)'),
  text: z.string().optional().describe('Search text filter'),
  service: z.string().optional().describe('Filter by service name'),
  order_field: z
    .string()
    .optional()
    .describe('Field to sort by: value, createdAt, updatedAt, occurrences, service'),
  order_direction: OrderDirectionEnum.optional().describe('Sort direction: ASC or DESC'),
});

export function createConsentListTriageDataFlowsTool(clients: ToolClients) {
  const graphql = clients.graphql as ConsentMixin;
  return defineTool({
    name: 'consent_list_triage_data_flows',
    description:
      'List data flows (network requests) in your consent manager. Use status=NEEDS_REVIEW to see ' +
      'data flows awaiting triage. Returns value (URL/host), service, tracking purposes, activity ' +
      '(occurrences), and more. Requires an airgap_bundle_id.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListTriageDataFlowsSchema,
    handler: async ({
      airgap_bundle_id,
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
      try {
        const result = await graphql.listConsentDataFlows({
          airgapBundleId: airgap_bundle_id,
          first: limit,
          offset,
          status,
          isJunk: is_junk,
          showZeroActivity: show_zero_activity,
          text,
          service,
          orderBy:
            order_field && order_direction
              ? [{ field: order_field, direction: order_direction }]
              : undefined,
        });
        return createListResult(result.nodes, {
          totalCount: result.totalCount,
          hasNextPage: result.pageInfo?.hasNextPage,
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });
}
