import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';
import {
  COOKIE_STATS,
  DATA_FLOW_STATS,
  type TranscendCliCookieStatsResponse,
  type TranscendCliDataFlowStatsResponse,
} from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const GetCookieStatsSchema = z.object({});
export type GetCookieStatsInput = z.infer<typeof GetCookieStatsSchema>;

export function createConsentGetTriageStatsTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_get_triage_stats',
    description:
      'Get statistics on cookies and data flows: live (approved), needs review (triage), ' +
      'and junk counts.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetCookieStatsSchema,
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
