import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
  type UpdateConsentDataFlowInput,
} from '@transcend-io/mcp-server-core';

import type { ConsentMixin } from '../graphql.js';
import { UpdateDataFlowsSchema } from '../schemas.js';

export function createConsentUpdateDataFlowsTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as ConsentMixin;
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
        airgap_bundle_id: { type: 'string', description: 'Airgap bundle ID' },
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
                enum: ['LIVE', 'NEEDS_REVIEW'],
                description: 'Set status',
              },
            },
            required: ['id'],
          },
        },
      },
      required: ['airgap_bundle_id', 'data_flows'],
    },
    handler: async (args) => {
      const parsed = validateArgs(UpdateDataFlowsSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const dfInputs: UpdateConsentDataFlowInput[] = parsed.data.data_flows.map((df) => ({
          id: df.id,
          ...(df.tracking_purposes ? { purposeIds: df.tracking_purposes } : {}),
          ...(df.description !== undefined ? { description: df.description } : {}),
          ...(df.service !== undefined ? { service: df.service } : {}),
          ...(df.is_junk !== undefined ? { isJunk: df.is_junk } : {}),
          ...(df.status !== undefined ? { status: df.status } : {}),
        }));
        const result = await graphql.updateConsentDataFlows(parsed.data.airgap_bundle_id, dfInputs);
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
