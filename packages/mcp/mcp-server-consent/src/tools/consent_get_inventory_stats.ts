import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  COOKIE_STATS,
  DATA_FLOW_STATS,
  type TranscendCliCookieStatsResponse,
  type TranscendCliDataFlowStatsResponse,
} from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const GetInventoryStatsSchema = z.object({});
export type GetInventoryStatsInput = z.infer<typeof GetInventoryStatsSchema>;

export function createConsentGetInventoryStatsTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_get_inventory_stats',
    description:
      'Get cookie and data-flow inventory triage counts: live (approved), needs review, and junk. ' +
      'This is inventory status, not consent analytics — use consent_get_aggregate_analytics or ' +
      'consent_get_timeseries_analytics for opt-in/out and signal metrics.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetInventoryStatsSchema,
    handler: async () => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const variables = { input: { airgapBundleId } };
      const [cookieData, dfData] = await Promise.all([
        clients.graphql.makeRequest<TranscendCliCookieStatsResponse>(COOKIE_STATS, variables),
        clients.graphql.makeRequest<TranscendCliDataFlowStatsResponse>(DATA_FLOW_STATS, variables),
      ]);
      return createToolResult(true, {
        cookies: cookieData.cookieStats,
        dataFlows: dfData.dataFlowStats,
      });
    },
  });
}
