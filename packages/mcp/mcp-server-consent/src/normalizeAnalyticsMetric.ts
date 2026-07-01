import { z } from '@transcend-io/mcp-server-base';
import { AirgapBundleAnalyticsMetric } from '@transcend-io/privacy-types';

const VALID_METRICS = new Set<string>(Object.values(AirgapBundleAnalyticsMetric));

/** Common agent/API guesses mapped to GraphQL AnalyticsEvent values */
const ANALYTICS_METRIC_ALIASES: Record<string, AirgapBundleAnalyticsMetric> = {
  PAGE_VIEW: AirgapBundleAnalyticsMetric.PageViews,
  CONSENT_SESSION: AirgapBundleAnalyticsMetric.SiteSessions,
  CONSENT_SESSIONS: AirgapBundleAnalyticsMetric.SiteSessions,
};

/**
 * Normalize metric input, accepting common aliases (e.g. PAGE_VIEW → PAGE_VIEWS).
 */
export function normalizeAnalyticsMetric(metric: string): AirgapBundleAnalyticsMetric | string {
  const upper = metric.toUpperCase();
  if (VALID_METRICS.has(upper)) {
    return upper as AirgapBundleAnalyticsMetric;
  }
  return ANALYTICS_METRIC_ALIASES[upper] ?? upper;
}

export const airgapBundleAnalyticsMetricSchema = z.preprocess(
  (value) => (typeof value === 'string' ? normalizeAnalyticsMetric(value) : value),
  z.nativeEnum(AirgapBundleAnalyticsMetric),
);
