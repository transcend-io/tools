import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import {
  UPDATE_DATA_FLOWS,
  type TranscendUpdateDataFlowInputGql,
  type TranscendCliUpdateDataFlowsResponse,
} from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

const ConsentTrackerStatusEnum = z.nativeEnum(ConsentTrackerStatus);

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
  data_flows: z.array(UpdateDataFlowItemSchema).min(1).describe('Data flows to update'),
});
export type UpdateDataFlowsInput = z.infer<typeof UpdateDataFlowsSchema>;

export function createConsentUpdateDataFlowsTool(clients: ToolClients) {
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
    handler: async ({ data_flows }) => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const dfInputs: TranscendUpdateDataFlowInputGql[] = data_flows.map((df) => ({
        id: df.id,
        ...(df.tracking_purposes ? { purposeIds: df.tracking_purposes } : {}),
        ...(df.description !== undefined ? { description: df.description } : {}),
        ...(df.service !== undefined ? { service: df.service } : {}),
        ...(df.is_junk !== undefined ? { isJunk: df.is_junk } : {}),
        ...(df.status !== undefined ? { status: df.status } : {}),
      }));
      const data = await clients.graphql.makeRequest<TranscendCliUpdateDataFlowsResponse>(
        UPDATE_DATA_FLOWS,
        {
          airgapBundleId,
          dataFlows: dfInputs,
        },
      );
      return createToolResult(true, {
        updated: data.updateDataFlows.dataFlows.length,
        dataFlows: data.updateDataFlows.dataFlows.map((df) => ({
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
