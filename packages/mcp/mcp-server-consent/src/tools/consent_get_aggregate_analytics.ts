import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { AirgapBundleAnalyticsDimension } from '@transcend-io/privacy-types';

import { resolveAnalyticsDateRange } from '../analyticsDateRange.js';
import { AggregateAnalyticsDoc } from '../graphql.js';
import { airgapBundleAnalyticsMetricSchema } from '../normalizeAnalyticsMetric.js';
import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const GetAggregateAnalyticsSchema = z.object({
  metric: airgapBundleAnalyticsMetricSchema.describe(
    'Analytics metric to query. CONSENT_CHANGED for opt-in/out counts; SITE_SESSIONS or PAGE_VIEWS for traffic totals.',
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
  include_dimensions: z
    .array(z.nativeEnum(AirgapBundleAnalyticsDimension))
    .optional()
    .describe(
      'Dimension breakdowns (e.g. NEW_VALUE, REGIME, PURPOSE). Recommended for CONSENT_CHANGED.',
    ),
});
export type GetAggregateAnalyticsInput = z.infer<typeof GetAggregateAnalyticsSchema>;

export function createConsentGetAggregateAnalyticsTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_get_aggregate_analytics',
    description:
      'Query aggregate consent analytics via airgapBundleAggregateAnalytics. ' +
      'Use CONSENT_CHANGED with NEW_VALUE/REGIME/PURPOSE for opt-in/out counts; ' +
      'SITE_SESSIONS or PAGE_VIEWS for total traffic. Requires ViewConsentManager API key scope.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetAggregateAnalyticsSchema,
    handler: async ({ metric, start, end, days, include_dimensions }) => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const range = resolveAnalyticsDateRange({ start, end, days });
      const data = await clients.graphql.makeRequest(AggregateAnalyticsDoc, {
        id: airgapBundleId,
        input: {
          metric,
          start: range.startEpoch,
          end: range.endEpoch,
          ...(include_dimensions?.length ? { includeDimensions: include_dimensions } : {}),
        },
      });
      const items = data.airgapBundleAggregateAnalytics.items;

      return createToolResult(true, {
        airgapBundleId,
        metric,
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
