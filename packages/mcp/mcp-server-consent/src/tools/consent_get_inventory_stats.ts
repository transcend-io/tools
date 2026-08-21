import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { COOKIE_STATS, type TranscendCliCookieStatsResponse } from '@transcend-io/sdk';

import { getDataFlowCount } from '../getDataFlowCount.js';
import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const GetInventoryStatsSchema = z.object({});
export type GetInventoryStatsInput = z.infer<typeof GetInventoryStatsSchema>;

export function createConsentGetInventoryStatsTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_get_inventory_stats',
    description:
      'Get cookie and data-flow inventory triage counts: live (approved), needs review, and junk. ' +
      'Counts match the Consent Manager tables and the default consent_list_cookies / ' +
      'consent_list_data_flows filters (CSP data flows are omitted, same as the UI). ' +
      'This is inventory status, not consent analytics — use consent_get_aggregate_analytics or ' +
      'consent_get_timeseries_analytics for opt-in/out and signal metrics.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetInventoryStatsSchema,
    handler: async () => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const [cookieData, needReviewCount, liveCount, junkCount] = await Promise.all([
        clients.graphql.makeRequest<TranscendCliCookieStatsResponse>(COOKIE_STATS, {
          input: { airgapBundleId },
        }),
        getDataFlowCount(clients.graphql, airgapBundleId, {
          status: ConsentTrackerStatus.NeedsReview,
        }),
        getDataFlowCount(clients.graphql, airgapBundleId, {
          status: ConsentTrackerStatus.Live,
          isJunk: false,
        }),
        getDataFlowCount(clients.graphql, airgapBundleId, {
          status: ConsentTrackerStatus.Live,
          isJunk: true,
        }),
      ]);

      return createToolResult(true, {
        cookies: cookieData.cookieStats,
        dataFlows: {
          liveCount,
          needReviewCount,
          junkCount,
        },
      });
    },
  });
}
