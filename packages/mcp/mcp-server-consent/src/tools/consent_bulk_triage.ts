import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
  type UpdateConsentDataFlowInput,
  type UpdateCookieInput,
} from '@transcend-io/mcp-server-core';

import type { ConsentMixin } from '../graphql.js';
import { BulkTriageSchema } from '../schemas.js';

export function createConsentBulkTriageTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as ConsentMixin;
  return {
    name: 'consent_bulk_triage',
    description:
      'Bulk triage action: approve or junk multiple cookies and data flows in a single call. ' +
      'For cookies, APPROVE sets status=LIVE; JUNK sets isJunk=true. ' +
      'For data flows, same behavior. Optionally assign tracking purposes and service when approving.',
    category: 'Consent Management',
    readOnly: false,
    confirmationHint: 'Bulk approves or junks cookies and data flows',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        airgap_bundle_id: { type: 'string', description: 'Airgap bundle ID' },
        items: {
          type: 'array',
          description: 'Items to triage',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['cookie', 'data_flow'],
                description: 'Item type',
              },
              id: {
                type: 'string',
                description: 'Cookie name (for cookies) or data flow ID (for data flows)',
              },
              action: {
                type: 'string',
                enum: ['APPROVE', 'JUNK'],
                description: 'Triage action',
              },
              tracking_purposes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tracking purposes (recommended when approving)',
              },
              service: { type: 'string', description: 'Service name to assign' },
            },
            required: ['type', 'id', 'action'],
          },
        },
      },
      required: ['airgap_bundle_id', 'items'],
    },
    handler: async (args) => {
      const parsed = validateArgs(BulkTriageSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const bundleId = parsed.data.airgap_bundle_id;
        const cookieItems = parsed.data.items.filter((i) => i.type === 'cookie');
        const dfItems = parsed.data.items.filter((i) => i.type === 'data_flow');

        const results: {
          cookies: { name: string; action: string; status: string }[];
          dataFlows: { id: string; action: string; status: string }[];
        } = { cookies: [], dataFlows: [] };

        if (cookieItems.length > 0) {
          const cookieInputs: UpdateCookieInput[] = cookieItems.map((item) => ({
            name: item.id,
            ...(item.action === 'APPROVE'
              ? { status: 'LIVE' as const, isJunk: false }
              : { status: 'LIVE' as const, isJunk: true }),
            ...(item.tracking_purposes ? { trackingPurposes: item.tracking_purposes } : {}),
            ...(item.service ? { service: item.service } : {}),
          }));
          await graphql.updateCookies(bundleId, cookieInputs);
          results.cookies = cookieInputs.map((c) => ({
            name: c.name,
            action: c.isJunk ? 'JUNKED' : 'APPROVED',
            status: c.status || 'LIVE',
          }));
        }

        if (dfItems.length > 0) {
          const dfInputs: UpdateConsentDataFlowInput[] = dfItems.map((item) => ({
            id: item.id,
            ...(item.action === 'APPROVE'
              ? { status: 'LIVE' as const, isJunk: false }
              : { status: 'LIVE' as const, isJunk: true }),
            ...(item.tracking_purposes ? { purposeIds: item.tracking_purposes } : {}),
            ...(item.service ? { service: item.service } : {}),
          }));
          const dfResult = await graphql.updateConsentDataFlows(bundleId, dfInputs);
          results.dataFlows = dfResult.dataFlows.map((df) => ({
            id: df.id,
            action: df.isJunk ? 'JUNKED' : 'APPROVED',
            status: df.status,
          }));
        }

        return createToolResult(true, {
          totalProcessed: cookieItems.length + dfItems.length,
          ...results,
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
