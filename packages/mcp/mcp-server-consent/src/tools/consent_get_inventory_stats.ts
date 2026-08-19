import {
  createToolResult,
  defineTool,
  defineToolWithCapabilities,
  McpClientCapability,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import {
  COOKIE_STATS,
  DATA_FLOW_STATS,
  type TranscendCliCookieStatsResponse,
  type TranscendCliDataFlowStatsResponse,
  type TranscendTrackerStatsGql,
} from '@transcend-io/sdk';

import { INVENTORY_STATS_APP_RESOURCE } from '../apps/inventory-stats.js';
import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const GetInventoryStatsSchema = z.object({});
export type GetInventoryStatsInput = z.infer<typeof GetInventoryStatsSchema>;

/** Cookie and data-flow triage counts returned by {@link createConsentGetInventoryStatsTool}. */
export interface InventoryStatsPayload {
  /** Cookie live / needs-review / junk counts */
  cookies: TranscendTrackerStatsGql;
  /** Data-flow live / needs-review / junk counts */
  dataFlows: TranscendTrackerStatsGql;
}

/** Shared by the baseline tool, the MCP App variant, and the refresh companion. */
async function inventoryStatsPayload(clients: ToolClients): Promise<unknown> {
  const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
  const variables = { input: { airgapBundleId } };
  const [cookieData, dfData] = await Promise.all([
    clients.graphql.makeRequest<TranscendCliCookieStatsResponse>(COOKIE_STATS, variables),
    clients.graphql.makeRequest<TranscendCliDataFlowStatsResponse>(DATA_FLOW_STATS, variables),
  ]);
  return createToolResult(true, {
    cookies: cookieData.cookieStats,
    dataFlows: dfData.dataFlowStats,
  } satisfies InventoryStatsPayload);
}

/** Companion the view calls to refresh itself. Never listed to the model. */
function createInventoryStatsRefreshTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_get_inventory_stats_refresh',
    description:
      'Re-fetch cookie and data-flow inventory triage counts for the inventory-stats view.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetInventoryStatsSchema,
    handler: async () => inventoryStatsPayload(clients),
  });
}

/**
 * Cookie and data-flow inventory triage counts.
 *
 * Renders as an interactive dashboard on hosts that support MCP Apps, and
 * returns plain JSON everywhere else.
 */
export function createConsentGetInventoryStatsTool(clients: ToolClients) {
  return defineToolWithCapabilities({
    name: 'consent_get_inventory_stats',
    description:
      'Get cookie and data-flow inventory triage counts: live (approved), needs review, and junk. ' +
      'This is inventory status, not consent analytics — use consent_get_aggregate_analytics or ' +
      'consent_get_timeseries_analytics for opt-in/out and signal metrics. ' +
      'On hosts that support MCP Apps, renders an interactive triage dashboard.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetInventoryStatsSchema,
    handler: async () => inventoryStatsPayload(clients),
    variants: {
      [McpClientCapability.McpApp]: {
        resource: INVENTORY_STATS_APP_RESOURCE,
        handler: async () => inventoryStatsPayload(clients),
        appOnlyTools: [createInventoryStatsRefreshTool(clients)],
      },
    },
  });
}
