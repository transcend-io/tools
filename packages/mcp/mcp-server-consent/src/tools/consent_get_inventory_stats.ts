import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import {
  COOKIE_STATS,
  DATA_FLOW_STATS,
  type TranscendCliCookieStatsResponse,
  type TranscendCliDataFlowStatsResponse,
} from '@transcend-io/sdk';

import { cspRemainder, getDataFlowCount, type DataFlowBucketCounts } from '../getDataFlowCount.js';
import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const GetInventoryStatsSchema = z.object({});
export type GetInventoryStatsInput = z.infer<typeof GetInventoryStatsSchema>;

export function createConsentGetInventoryStatsTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_get_inventory_stats',
    description:
      'Get cookie and data-flow inventory triage counts: live (approved), needs review, and junk. ' +
      'Top-level dataFlows.* counts include hidden CSP rows from the backend rollup. ' +
      'Use dataFlows.triageTable.* for counts that match the Consent Manager table and ' +
      'consent_list_data_flows defaults. dataFlows.csp.* is the hidden CSP remainder ' +
      '(stats minus triageTable). Cookies have no CSP type; cookie defaults already match ' +
      'cookies.needReviewCount. This is inventory status, not consent analytics — use ' +
      'consent_get_aggregate_analytics or consent_get_timeseries_analytics for opt-in/out ' +
      'and signal metrics.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetInventoryStatsSchema,
    handler: async () => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const variables = { input: { airgapBundleId } };
      const [cookieData, dfData, triageNeedReview, triageLive, triageJunk] = await Promise.all([
        clients.graphql.makeRequest<TranscendCliCookieStatsResponse>(COOKIE_STATS, variables),
        clients.graphql.makeRequest<TranscendCliDataFlowStatsResponse>(DATA_FLOW_STATS, variables),
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

      const stats = dfData.dataFlowStats;
      const triageTable: DataFlowBucketCounts = {
        liveCount: triageLive,
        needReviewCount: triageNeedReview,
        junkCount: triageJunk,
      };

      return createToolResult(true, {
        cookies: cookieData.cookieStats,
        dataFlows: {
          liveCount: stats.liveCount,
          needReviewCount: stats.needReviewCount,
          junkCount: stats.junkCount,
          triageTable,
          csp: {
            liveCount: cspRemainder(stats.liveCount, triageTable.liveCount),
            needReviewCount: cspRemainder(stats.needReviewCount, triageTable.needReviewCount),
            junkCount: cspRemainder(stats.junkCount, triageTable.junkCount),
          },
        },
      });
    },
  });
}
