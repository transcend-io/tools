import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import {
  UPDATE_OR_CREATE_COOKIES,
  UPDATE_DATA_FLOWS,
  type TranscendUpdateCookieInputGql,
  type TranscendUpdateDataFlowInputGql,
  type TranscendCliUpdateOrCreateCookiesResponse,
  type TranscendCliUpdateDataFlowsResponse,
} from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';
import { ConsentTrackerTypeEnum, TriageActionEnum } from '../schemas.js';

export const BulkTriageItemSchema = z.object({
  type: ConsentTrackerTypeEnum.describe('Item type'),
  id: z.string().describe('Item ID (for data flows) or cookie name (for cookies)'),
  action: TriageActionEnum.describe('Action to take: APPROVE or JUNK'),
  tracking_purposes: z
    .array(z.string())
    .optional()
    .describe('Tracking purposes to assign (required when approving)'),
  service: z.string().optional().describe('Service name to assign'),
});
export type BulkTriageItemInput = z.infer<typeof BulkTriageItemSchema>;

export const BulkTriageSchema = z.object({
  items: z.array(BulkTriageItemSchema).min(1).describe('Items to triage'),
});
export type BulkTriageInput = z.infer<typeof BulkTriageSchema>;

export function createConsentBulkTriageTool(clients: ToolClients) {
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
    handler: async ({ items }) => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const cookieItems = items.filter((i) => i.type === 'cookie');
      const dfItems = items.filter((i) => i.type === 'data_flow');

      const results: {
        /** Updated cookies */
        cookies: { name: string; action: string; status: string }[];
        /** Updated data flows */
        dataFlows: { id: string; action: string; status: string }[];
      } = { cookies: [], dataFlows: [] };

      if (cookieItems.length > 0) {
        const cookieInputs: TranscendUpdateCookieInputGql[] = cookieItems.map((item) => ({
          name: item.id,
          ...(item.action === 'APPROVE'
            ? { status: ConsentTrackerStatus.Live, isJunk: false }
            : { status: ConsentTrackerStatus.Live, isJunk: true }),
          ...(item.tracking_purposes ? { trackingPurposes: item.tracking_purposes } : {}),
          ...(item.service ? { service: item.service } : {}),
        }));
        await clients.graphql.makeRequest<TranscendCliUpdateOrCreateCookiesResponse>(
          UPDATE_OR_CREATE_COOKIES,
          {
            airgapBundleId,
            cookies: cookieInputs,
          },
        );
        results.cookies = cookieInputs.map((c) => ({
          name: c.name,
          action: c.isJunk ? 'JUNKED' : 'APPROVED',
          status: c.status || 'LIVE',
        }));
      }

      if (dfItems.length > 0) {
        const dfInputs: TranscendUpdateDataFlowInputGql[] = dfItems.map((item) => ({
          id: item.id,
          ...(item.action === 'APPROVE'
            ? { status: ConsentTrackerStatus.Live, isJunk: false }
            : { status: ConsentTrackerStatus.Live, isJunk: true }),
          ...(item.tracking_purposes ? { purposeIds: item.tracking_purposes } : {}),
          ...(item.service ? { service: item.service } : {}),
        }));
        const dfResult = await clients.graphql.makeRequest<TranscendCliUpdateDataFlowsResponse>(
          UPDATE_DATA_FLOWS,
          {
            airgapBundleId,
            dataFlows: dfInputs,
          },
        );
        results.dataFlows = dfResult.updateDataFlows.dataFlows.map((df) => ({
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
