import {
  AirgapBundleAnalyticsDimension,
  AirgapBundleAnalyticsMetric,
} from '@transcend-io/privacy-types';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { resolveAnalyticsDateRange } from '../src/analyticsDateRange.js';
import { normalizeAnalyticsMetric } from '../src/normalizeAnalyticsMetric.js';
import { GetAggregateAnalyticsSchema } from '../src/tools/consent_get_aggregate_analytics.js';
import { GetTimeseriesAnalyticsSchema } from '../src/tools/consent_get_timeseries_analytics.js';
import { getConsentTools } from '../src/tools/index.js';

const EXPECTED_TOOL_NAMES = [
  'consent_get_preferences',
  'consent_set_preferences',
  'consent_list_purposes',
  'consent_list_data_flows',
  'consent_list_cookies',
  'consent_list_airgap_bundles',
  'consent_list_regimes',
  'consent_get_inventory_stats',
  'consent_get_aggregate_analytics',
  'consent_get_timeseries_analytics',
  'consent_get_analytics_data',
  'consent_update_cookies',
  'consent_update_data_flows',
  'consent_bulk_triage',
] as const;

describe('Consent Tools', () => {
  let mockGraphql: {
    makeRequest: ReturnType<typeof vi.fn>;
    testConnection: ReturnType<typeof vi.fn>;
    getBaseUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphql = {
      makeRequest: vi.fn(),
      testConnection: vi.fn(),
      getBaseUrl: vi.fn().mockReturnValue('https://api.transcend.io'),
    };
  });

  const getTools = () =>
    getConsentTools({
      rest: {} as never,
      graphql: mockGraphql as never,
      dashboardUrl: 'https://app.transcend.io',
    });

  it(`registers exactly ${EXPECTED_TOOL_NAMES.length} tools with expected names`, () => {
    const tools = getTools();
    expect(tools).toHaveLength(EXPECTED_TOOL_NAMES.length);
    expect(tools.map((t) => t.name)).toEqual([...EXPECTED_TOOL_NAMES]);
  });

  describe('consent_update_cookies', () => {
    it('zodSchema rejects input when required fields are missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'consent_update_cookies')!;

      const result = tool.zodSchema.safeParse({});
      expect(result.success).toBe(false);
      expect((result as any).error.issues.map((i: any) => i.path[0])).toEqual(
        expect.arrayContaining(['cookies']),
      );
    });
  });

  describe('consent_list_purposes', () => {
    it('returns list on success', async () => {
      const nodes = [{ id: 'p1', name: 'Analytics', trackingType: 'ANALYTICS' }];
      mockGraphql.makeRequest.mockResolvedValue({
        purposes: { nodes, totalCount: 1 },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'consent_list_purposes')!;

      const result = await tool.handler({});

      expect(result).toMatchObject({ success: true, data: nodes, totalCount: 1 });
    });

    it('returns error when client throws', async () => {
      mockGraphql.makeRequest.mockRejectedValue(new Error('GraphQL error'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'consent_list_purposes')!;

      await expect(tool.handler({})).rejects.toThrow('GraphQL error');
    });
  });

  describe('consent_list_data_flows', () => {
    const mockBundle = () =>
      mockGraphql.makeRequest.mockResolvedValueOnce({
        consentManager: { consentManager: { id: 'bundle-1' } },
      });

    const runDataFlows = async (input: Record<string, unknown>) => {
      mockBundle();
      mockGraphql.makeRequest.mockResolvedValueOnce({
        dataFlows: { nodes: [], totalCount: 0 },
      });
      const tool = getTools().find((t) => t.name === 'consent_list_data_flows')!;
      await tool.handler(tool.zodSchema.parse(input));
      // Second call is the DATA_FLOWS query; grab its variables.
      return mockGraphql.makeRequest.mock.calls[1][1];
    };

    it('sends filterBy.service = "" when unmappedOnly is set (takes precedence over service)', async () => {
      const variables = await runDataFlows({
        status: 'LIVE',
        unmappedOnly: true,
        service: 'Google Analytics',
      });
      expect(variables.filterBy.service).toBe('');
    });

    it('passes through type and minOccurrences filters', async () => {
      const variables = await runDataFlows({
        status: 'NEEDS_REVIEW',
        type: 'CSP',
        minOccurrences: 10,
      });
      expect(variables.filterBy).toMatchObject({ type: 'CSP', minOccurrences: 10 });
    });

    it('omits showZeroActivity by default for NEEDS_REVIEW so counts match inventory stats', async () => {
      const variables = await runDataFlows({ status: 'NEEDS_REVIEW' });
      expect(variables.filterBy).not.toHaveProperty('showZeroActivity');
    });
  });

  describe('consent_list_cookies', () => {
    it('forwards orderBy when sorting by occurrences', async () => {
      mockGraphql.makeRequest.mockResolvedValueOnce({
        consentManager: { consentManager: { id: 'bundle-1' } },
      });
      mockGraphql.makeRequest.mockResolvedValueOnce({
        cookies: { nodes: [], totalCount: 0 },
      });
      const tool = getTools().find((t) => t.name === 'consent_list_cookies')!;
      await tool.handler(
        tool.zodSchema.parse({
          status: 'LIVE',
          orderField: 'occurrences',
          orderDirection: 'DESC',
        }),
      );
      const variables = mockGraphql.makeRequest.mock.calls[1][1];
      expect(variables.orderBy).toEqual([{ field: 'occurrences', direction: 'DESC' }]);
    });

    it('zodSchema accepts occurrences as an orderField', () => {
      const tool = getTools().find((t) => t.name === 'consent_list_cookies')!;
      const result = tool.zodSchema.safeParse({ status: 'LIVE', orderField: 'occurrences' });
      expect(result.success).toBe(true);
    });
  });

  describe('consent_get_aggregate_analytics', () => {
    it('queries aggregate analytics with resolved bundle id', async () => {
      mockGraphql.makeRequest
        .mockResolvedValueOnce({
          consentManager: { consentManager: { id: 'bundle-1' } },
        })
        .mockResolvedValueOnce({
          airgapBundleAggregateAnalytics: {
            items: [{ measure: '10', dimensions: { PURPOSE: 'Advertising' } }],
          },
        });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'consent_get_aggregate_analytics')!;

      const result = await tool.handler({
        metric: AirgapBundleAnalyticsMetric.ConsentChanged,
        days: 7,
        include_dimensions: [
          AirgapBundleAnalyticsDimension.Purpose,
          AirgapBundleAnalyticsDimension.Regime,
          AirgapBundleAnalyticsDimension.NewValue,
        ],
      });

      expect(result).toMatchObject({
        success: true,
        data: {
          airgapBundleId: 'bundle-1',
          metric: AirgapBundleAnalyticsMetric.ConsentChanged,
          totalRows: 1,
        },
      });
    });
  });
});

describe('normalizeAnalyticsMetric', () => {
  it('maps common metric aliases to GraphQL enum values', () => {
    expect(normalizeAnalyticsMetric('PAGE_VIEW')).toBe(AirgapBundleAnalyticsMetric.PageViews);
    expect(normalizeAnalyticsMetric('page_view')).toBe(AirgapBundleAnalyticsMetric.PageViews);
    expect(normalizeAnalyticsMetric('CONSENT_SESSION')).toBe(
      AirgapBundleAnalyticsMetric.SiteSessions,
    );
    expect(normalizeAnalyticsMetric('CONSENT_SESSIONS')).toBe(
      AirgapBundleAnalyticsMetric.SiteSessions,
    );
    expect(normalizeAnalyticsMetric('PAGE_VIEWS')).toBe(AirgapBundleAnalyticsMetric.PageViews);
  });

  it('accepts PAGE_VIEW in timeseries schema', () => {
    const result = GetTimeseriesAnalyticsSchema.safeParse({
      metric: 'PAGE_VIEW',
      days: 30,
      bin_interval: '1d',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metric).toBe(AirgapBundleAnalyticsMetric.PageViews);
    }
  });

  it('accepts PAGE_VIEW in aggregate schema', () => {
    const result = GetAggregateAnalyticsSchema.safeParse({
      metric: 'PAGE_VIEW',
      days: 7,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metric).toBe(AirgapBundleAnalyticsMetric.PageViews);
    }
  });
});

describe('resolveAnalyticsDateRange', () => {
  it('defaults to a 7-day lookback ending now', () => {
    const now = Date.now();
    const range = resolveAnalyticsDateRange({});
    expect(range.endEpoch).toBeGreaterThanOrEqual(Math.floor(now / 1000) - 2);
    expect(range.endEpoch - range.startEpoch).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 - 2);
  });

  it('throws when start is after end', () => {
    expect(() =>
      resolveAnalyticsDateRange({
        start: '2024-01-02T00:00:00.000Z',
        end: '2024-01-01T00:00:00.000Z',
      }),
    ).toThrow('Start date must be before end date');
  });
});
