import {
  createToolResult,
  defineTool,
  z,
  type ToolClients,
  type UpdateConsentDataFlowInput,
  type UpdateCookieInput,
} from '@transcend-io/mcp-server-core';

import type { ConsentMixin } from '../graphql.js';

const TriageActionEnum = z.enum(['APPROVE', 'JUNK']);

const BulkTriageItemSchema = z.object({
  type: z.enum(['cookie', 'data_flow']).describe('Item type'),
  id: z.string().describe('Item ID (for data flows) or cookie name (for cookies)'),
  action: TriageActionEnum.describe('Action to take: APPROVE or JUNK'),
  tracking_purposes: z
    .array(z.string())
    .optional()
    .describe('Tracking purposes to assign (required when approving)'),
  service: z.string().optional().describe('Service name to assign'),
});

const BulkTriageSchema = z.object({
  airgap_bundle_id: z.string().describe('Airgap bundle ID'),
  items: z.array(BulkTriageItemSchema).min(1).describe('Items to triage'),
});

export function createConsentBulkTriageTool(clients: ToolClients) {
  const graphql = clients.graphql as ConsentMixin;
  return defineTool({
    name: 'consent_bulk_triage',
    description:
      'Bulk triage action: approve or junk multiple cookies and data flows in a single call. ' +
      'For cookies, APPROVE sets status=LIVE; JUNK sets isJunk=true. ' +
      'For data flows, same behavior. Optionally assign tracking purposes and service when approving.',
    category: 'Consent Management',
    readOnly: false,
    confirmationHint: 'Bulk approves or junks cookies and data flows',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: BulkTriageSchema,
    handler: async ({ airgap_bundle_id, items }) => {
      const bundleId = airgap_bundle_id;
      const cookieItems = items.filter((i) => i.type === 'cookie');
      const dfItems = items.filter((i) => i.type === 'data_flow');

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
    },
  });
}
