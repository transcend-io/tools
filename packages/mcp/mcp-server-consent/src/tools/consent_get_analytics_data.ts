import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  ConsentManagerAnalyticsDataSource,
  ConsentManagerMetricBin,
} from '@transcend-io/privacy-types';
import { CONSENT_MANAGER_ANALYTICS_DATA, type ConsentManagerMetric } from '@transcend-io/sdk';

import { resolveAnalyticsDateRange } from '../analyticsDateRange.js';
import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const GetAnalyticsDataSchema = z.object({
  data_source: z
    .nativeEnum(ConsentManagerAnalyticsDataSource)
    .describe(
      'analyticsData source: PRIVACY_SIGNAL_TIMESERIES (DNT/GPC), ' +
        'CONSENT_CHANGES_TIMESERIES (opt-in/out), or CONSENT_SESSIONS_BY_REGIME.',
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
  bin: z
    .nativeEnum(ConsentManagerMetricBin)
    .optional()
    .default(ConsentManagerMetricBin.Daily)
    .describe('Time bin size for analyticsData (1h or 1d, default: 1d).'),
});
export type GetAnalyticsDataInput = z.infer<typeof GetAnalyticsDataSchema>;

export function createConsentGetAnalyticsDataTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_get_analytics_data',
    description:
      'Query consent metrics via the analyticsData GraphQL query. ' +
      'Returns timeseries for privacy signals (DNT/GPC), consent changes (opt-in/out), ' +
      'or sessions by regime. Requires ViewConsentManager API key scope.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetAnalyticsDataSchema,
    handler: async ({ data_source, start, end, days, bin }) => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const range = resolveAnalyticsDateRange({ start, end, days });
      const data = await clients.graphql.makeRequest<{
        analyticsData: { series: ConsentManagerMetric[] };
      }>(CONSENT_MANAGER_ANALYTICS_DATA, {
        input: {
          dataSource: data_source,
          startDate: range.startIso,
          endDate: range.endIso,
          forceRefetch: true,
          airgapBundleId,
          binInterval: bin,
          smoothTimeseries: false,
        },
      });
      const series = data.analyticsData.series;

      return createToolResult(true, {
        airgapBundleId,
        dataSource: data_source,
        binInterval: bin,
        period: {
          start: range.startIso,
          end: range.endIso,
        },
        series,
      });
    },
  });
}
