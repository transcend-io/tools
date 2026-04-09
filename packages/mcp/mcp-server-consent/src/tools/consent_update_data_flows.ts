import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import {
  UPDATE_DATA_FLOWS,
  type TranscendUpdateDataFlowInputGql,
  type TranscendCliUpdateDataFlowsResponse,
} from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';
import { UpdateDataFlowsSchema } from '../schemas.js';

export function createConsentUpdateDataFlowsTool(clients: ToolClients): ToolDefinition {
  return {
    name: 'consent_update_data_flows',
    description:
      'Update one or more data flows. Use to approve (status=LIVE), junk (is_junk=true), ' +
      'assign tracking purposes, or set a service.',
    category: 'Consent Management',
    readOnly: false,
    confirmationHint: 'Updates data flows in the consent manager',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        data_flows: {
          type: 'array',
          description: 'Data flows to update',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Data flow ID' },
              tracking_purposes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tracking purpose slugs',
              },
              description: { type: 'string', description: 'Data flow description' },
              service: { type: 'string', description: 'Service name' },
              is_junk: { type: 'boolean', description: 'Mark as junk' },
              status: {
                type: 'string',
                enum: Object.values(ConsentTrackerStatus),
                description: 'Set status',
              },
            },
            required: ['id'],
          },
        },
      },
      required: ['data_flows'],
    },
    handler: async (args) => {
      const parsed = validateArgs(UpdateDataFlowsSchema, args);
      if (!parsed.success) return parsed.error;
      const { data_flows } = parsed.data;
      try {
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
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}
