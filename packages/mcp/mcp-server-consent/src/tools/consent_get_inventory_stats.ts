import {
  createToolResult,
  defineToolWithCapabilities,
  McpClientCapability,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import {
  COOKIE_STATS,
  type TranscendCliCookieStatsResponse,
  type TranscendTrackerStatsGql,
} from '@transcend-io/sdk';

import { INVENTORY_STATS_APP_RESOURCE } from '../apps/inventory-stats.js';
import { getDataFlowCount } from '../getDataFlowCount.js';
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

const TOOL_DESCRIPTION =
  'Get cookie and data-flow inventory triage counts: live (approved), needs review, and junk. ' +
  'Counts match the Consent Manager tables and the default consent_list_cookies / ' +
  'consent_list_data_flows filters (CSP data flows are omitted, same as the UI). ' +
  'This is inventory status, not consent analytics — use consent_get_aggregate_analytics or ' +
  'consent_get_timeseries_analytics for opt-in/out and signal metrics. ' +
  'On hosts that support MCP Apps, renders an interactive triage dashboard.';

/** Shared by the baseline tool and the MCP App variant. */
async function inventoryStatsPayload(clients: ToolClients): Promise<unknown> {
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
  } satisfies InventoryStatsPayload);
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
    description: TOOL_DESCRIPTION,
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetInventoryStatsSchema,
    handler: async () => inventoryStatsPayload(clients),
    variants: {
      [McpClientCapability.McpApp]: {
        resource: INVENTORY_STATS_APP_RESOURCE,
        handler: async () => inventoryStatsPayload(clients),
      },
    },
  });
}
