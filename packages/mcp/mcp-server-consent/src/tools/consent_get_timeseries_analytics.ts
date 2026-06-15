import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  AirgapBundleAnalyticsBinInterval,
  AirgapBundleAnalyticsMetric,
} from '@transcend-io/privacy-types';
import {
  AIRGAP_BUNDLE_TIMESERIES_ANALYTICS,
  type TranscendCliAirgapBundleTimeseriesAnalyticsResponse,
} from '@transcend-io/sdk';

import { resolveAnalyticsDateRange } from '../analyticsDateRange.js';
import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const GetTimeseriesAnalyticsSchema = z.object({
  metric: z
    .nativeEnum(AirgapBundleAnalyticsMetric)
    .describe(
      'Analytics metric to query. PAGE_VIEWS for daily page-view volume; SITE_SESSIONS for sessions; ' +
        'SIGNAL_DETECTED for GPC/DNT signal counts over time.',
    ),
  start: z
    .string()
    .optional()
    .describe('Start datetime (ISO 8601). Defaults to `days` lookback from end.'),
  end: z.string().optional().describe('End datetime (ISO 8601). Defaults to now.'),
  days: z.coerce
    .number()
    .min(1)
    .max(365)
    .optional()
    .describe('Lookback window in days when start is omitted (default: 7).'),
  bin_interval: z
    .nativeEnum(AirgapBundleAnalyticsBinInterval)
    .optional()
    .default(AirgapBundleAnalyticsBinInterval.Hourly)
    .describe('Time bin size: 1m, 1h, or 1d (default: 1h).'),
});
export type GetTimeseriesAnalyticsInput = z.infer<typeof GetTimeseriesAnalyticsSchema>;

export function createConsentGetTimeseriesAnalyticsTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_get_timeseries_analytics',
    description:
      'Query timeseries consent analytics via airgapBundleTimeseriesAnalytics. ' +
      'Use PAGE_VIEWS or SITE_SESSIONS for traffic volume; SIGNAL_DETECTED for privacy signal counts. ' +
      'Requires ViewConsentManager API key scope.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetTimeseriesAnalyticsSchema,
    handler: async ({ metric, start, end, days, bin_interval }) => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const range = resolveAnalyticsDateRange({ start, end, days });
      const data =
        await clients.graphql.makeRequest<TranscendCliAirgapBundleTimeseriesAnalyticsResponse>(
          AIRGAP_BUNDLE_TIMESERIES_ANALYTICS,
          {
            id: airgapBundleId,
            input: {
              metric,
              start: range.startEpoch,
              end: range.endEpoch,
              binInterval: bin_interval,
            },
          },
        );
      const items = data.airgapBundleTimeseriesAnalytics.items;

      return createToolResult(true, {
        airgapBundleId,
        metric,
        binInterval: bin_interval,
        period: {
          start: range.startIso,
          end: range.endIso,
          startEpoch: range.startEpoch,
          endEpoch: range.endEpoch,
        },
        items,
        totalRows: items.length,
      });
    },
  });
}
