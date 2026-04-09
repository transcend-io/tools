import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';
import {
  COOKIE_STATS,
  DATA_FLOW_STATS,
  type TranscendCliCookieStatsResponse,
  type TranscendCliDataFlowStatsResponse,
} from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';
import { GetCookieStatsSchema } from '../schemas.js';

export function createConsentGetTriageStatsTool(clients: ToolClients): ToolDefinition {
  return {
    name: 'consent_get_triage_stats',
    description:
      'Get statistics on cookies and data flows: live (approved), needs review (triage), ' +
      'and junk counts. Optionally filter by show_zero_activity to include/exclude ' +
      'items with no telemetry activity.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        show_zero_activity: {
          type: 'boolean',
          description: 'Include items with zero activity in counts (default: server default)',
        },
      },
      required: [],
    },
    handler: async (args) => {
      const parsed = validateArgs(GetCookieStatsSchema, args);
      if (!parsed.success) return parsed.error;
      const { show_zero_activity } = parsed.data;
      try {
        const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
        const variables = {
          input: { airgapBundleId },
          ...(show_zero_activity !== undefined
            ? { filterBy: { showZeroActivity: show_zero_activity } }
            : {}),
        };

        const [cookieData, dfData] = await Promise.all([
          clients.graphql.makeRequest<TranscendCliCookieStatsResponse>(COOKIE_STATS, variables),
          clients.graphql.makeRequest<TranscendCliDataFlowStatsResponse>(
            DATA_FLOW_STATS,
            variables,
          ),
        ]);

        return createToolResult(true, {
          cookies: cookieData.cookieStats,
          dataFlows: dfData.dataFlowStats,
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
