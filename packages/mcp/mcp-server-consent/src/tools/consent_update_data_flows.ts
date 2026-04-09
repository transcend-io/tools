import {
  createToolResult,
  defineTool,
  z,
  type ToolClients,
  type UpdateConsentDataFlowInput,
} from '@transcend-io/mcp-server-core';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';

import type { ConsentMixin } from '../graphql.js';

export const ConsentTrackerStatusEnum = z.nativeEnum(ConsentTrackerStatus);

export const UpdateDataFlowItemSchema = z.object({
  id: z.string().describe('Data flow ID'),
  tracking_purposes: z.array(z.string()).optional().describe('Tracking purpose slugs'),
  description: z.string().optional().describe('Data flow description'),
  service: z.string().optional().describe('Service/integration name'),
  is_junk: z.boolean().optional().describe('Mark as junk'),
  status: ConsentTrackerStatusEnum.optional().describe(
    'Set status to LIVE (approve) or NEEDS_REVIEW',
  ),
});
export type UpdateDataFlowItemInput = z.infer<typeof UpdateDataFlowItemSchema>;

export const UpdateDataFlowsSchema = z.object({
  airgap_bundle_id: z.string().describe('Airgap bundle ID'),
  data_flows: z.array(UpdateDataFlowItemSchema).min(1).describe('Data flows to update'),
});
export type UpdateDataFlowsInput = z.infer<typeof UpdateDataFlowsSchema>;

export function createConsentUpdateDataFlowsTool(clients: ToolClients) {
  const graphql = clients.graphql as ConsentMixin;
  return defineTool({
    name: 'consent_update_data_flows',
    description:
      'Update one or more data flows. Use to approve (status=LIVE), junk (is_junk=true), ' +
      'assign tracking purposes, or set a service.',
    category: 'Consent Management',
    readOnly: false,
    confirmationHint: 'Updates data flows in the consent manager',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    zodSchema: UpdateDataFlowsSchema,
    handler: async ({ airgap_bundle_id, data_flows }) => {
      const dfInputs: UpdateConsentDataFlowInput[] = data_flows.map((df) => ({
        id: df.id,
        ...(df.tracking_purposes ? { purposeIds: df.tracking_purposes } : {}),
        ...(df.description !== undefined ? { description: df.description } : {}),
        ...(df.service !== undefined ? { service: df.service } : {}),
        ...(df.is_junk !== undefined ? { isJunk: df.is_junk } : {}),
        ...(df.status !== undefined ? { status: df.status } : {}),
      }));
      const result = await graphql.updateConsentDataFlows(airgap_bundle_id, dfInputs);
      return createToolResult(true, {
        updated: result.dataFlows.length,
        dataFlows: result.dataFlows.map((df) => ({
          id: df.id,
          value: df.value,
          status: df.status,
          isJunk: df.isJunk,
          purposes: df.purposes.map((p) => p.name),
          service: df.service?.title,
        })),
      });
    },
  });
}
