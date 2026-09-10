import { isCapabilityAwareTool, McpClientCapability } from '@transcend-io/mcp-server-base';
import {
  AirgapBundleAnalyticsDimension,
  AirgapBundleAnalyticsMetric,
} from '@transcend-io/privacy-types';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { resolveAnalyticsDateRange } from '../src/analyticsDateRange.js';
import { CookieTriagePurposeCategory } from '../src/lib/cookieTriageConfig.js';
import { ConsentTriageType } from '../src/lib/cookieTriageTypes.js';
import { normalizeAnalyticsMetric } from '../src/normalizeAnalyticsMetric.js';
import { GetAggregateAnalyticsSchema } from '../src/tools/consent_get_aggregate_analytics.js';
import { GetTimeseriesAnalyticsSchema } from '../src/tools/consent_get_timeseries_analytics.js';
import { CookieTriageAppSchema } from '../src/tools/cookie_triage_app.js';
import { getConsentTools } from '../src/tools/index.js';
import cookieTriageHtml from '../src/ui/generated/cookie-triage.html';
import inventoryStatsHtml from '../src/ui/generated/inventory-stats.html';

const EXPECTED_TOOL_NAMES = [
  'consent_get_preferences',
  'consent_list_purposes',
  'consent_list_data_flows',
  'consent_list_cookies',
  'consent_list_airgap_bundles',
  'consent_list_regimes',
  'consent_get_inventory_stats',
  'consent_cookie_triage_review_app',
  'consent_get_aggregate_analytics',
  'consent_get_timeseries_analytics',
  'consent_get_analytics_data',
  'consent_update_cookies',
  'consent_delete_cookies',
  'consent_update_data_flows',
  'consent_delete_data_flows',
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

  describe('consent_delete_cookies', () => {
    it('is app-only and not listed to the model', () => {
      const tool = getTools().find((t) => t.name === 'consent_delete_cookies')!;
      expect(tool.visibility).toEqual(['app']);
    });

    it('zodSchema rejects input when ids are missing', () => {
      const tool = getTools().find((t) => t.name === 'consent_delete_cookies')!;
      const result = tool.zodSchema.safeParse({});
      expect(result.success).toBe(false);
      expect((result as any).error.issues.map((i: any) => i.path[0])).toEqual(
        expect.arrayContaining(['ids']),
      );
    });

    it('deletes cookies by id via DeleteCookies', async () => {
      mockGraphql.makeRequest
        .mockResolvedValueOnce({ consentManager: { consentManager: { id: 'bundle-1' } } })
        .mockResolvedValueOnce({ deleteCookies: { clientMutationId: null, success: true } });

      const tool = getTools().find((t) => t.name === 'consent_delete_cookies')!;
      const ids = ['81db4ed5-1648-4c87-a064-fd5c46095267'];
      const result = await tool.handler(tool.zodSchema.parse({ ids }));

      expect(mockGraphql.makeRequest).toHaveBeenLastCalledWith(expect.anything(), {
        input: { airgapBundleId: 'bundle-1', ids },
      });
      expect(result).toMatchObject({
        success: true,
        data: { deleted: 1, ids, success: true },
      });
    });
  });

  describe('consent_delete_data_flows', () => {
    it('is app-only and not listed to the model', () => {
      const tool = getTools().find((t) => t.name === 'consent_delete_data_flows')!;
      expect(tool.visibility).toEqual(['app']);
    });

    it('zodSchema rejects input when ids are missing', () => {
      const tool = getTools().find((t) => t.name === 'consent_delete_data_flows')!;
      const result = tool.zodSchema.safeParse({});
      expect(result.success).toBe(false);
      expect((result as any).error.issues.map((i: any) => i.path[0])).toEqual(
        expect.arrayContaining(['ids']),
      );
    });

    it('deletes data flows by id via DeleteDataFlows', async () => {
      mockGraphql.makeRequest
        .mockResolvedValueOnce({ consentManager: { consentManager: { id: 'bundle-1' } } })
        .mockResolvedValueOnce({ deleteDataFlows: { clientMutationId: null, success: true } });

      const tool = getTools().find((t) => t.name === 'consent_delete_data_flows')!;
      const ids = ['a1b2c3d4-5678-90ab-cdef-111213141516'];
      const result = await tool.handler(tool.zodSchema.parse({ ids }));

      expect(mockGraphql.makeRequest).toHaveBeenLastCalledWith(expect.anything(), {
        input: { airgapBundleId: 'bundle-1', ids },
      });
      expect(result).toMatchObject({
        success: true,
        data: { deleted: 1, ids, success: true },
      });
    });
  });

  describe('consent_update_data_flows', () => {
    it('sends purpose slugs as trackingType, not purposeIds', async () => {
      mockGraphql.makeRequest
        .mockResolvedValueOnce({ consentManager: { consentManager: { id: 'bundle-1' } } })
        .mockResolvedValueOnce({
          updateDataFlows: {
            dataFlows: [
              {
                id: 'df-1',
                value: 'example.com',
                status: 'LIVE',
                isJunk: false,
                purposes: [{ name: 'Analytics' }],
                service: { title: 'Example' },
              },
            ],
          },
        });

      const tool = getTools().find((t) => t.name === 'consent_update_data_flows')!;
      await tool.handler(
        tool.zodSchema.parse({
          dataFlows: [{ id: 'df-1', trackingPurposes: ['Analytics'], status: 'LIVE' }],
        }),
      );

      expect(mockGraphql.makeRequest).toHaveBeenLastCalledWith(expect.anything(), {
        airgapBundleId: 'bundle-1',
        dataFlows: [{ id: 'df-1', trackingType: ['Analytics'], status: 'LIVE' }],
      });
    });
  });

  describe('consent_bulk_triage', () => {
    it('sends data flow purpose slugs as trackingType, not purposeIds', async () => {
      mockGraphql.makeRequest
        .mockResolvedValueOnce({ consentManager: { consentManager: { id: 'bundle-1' } } })
        .mockResolvedValueOnce({
          updateDataFlows: {
            dataFlows: [{ id: 'df-1', status: 'LIVE', isJunk: false }],
          },
        });

      const tool = getTools().find((t) => t.name === 'consent_bulk_triage')!;
      await tool.handler(
        tool.zodSchema.parse({
          items: [
            {
              type: 'data_flow',
              id: 'df-1',
              action: 'APPROVE',
              trackingPurposes: ['Advertising'],
            },
          ],
        }),
      );

      expect(mockGraphql.makeRequest).toHaveBeenLastCalledWith(expect.anything(), {
        airgapBundleId: 'bundle-1',
        dataFlows: [
          {
            id: 'df-1',
            status: 'LIVE',
            isJunk: false,
            trackingType: ['Advertising'],
          },
        ],
      });
    });
  });

  describe('consent_list_regimes', () => {
    it('trims the extra row the experiences query returns beyond `first`', async () => {
      // The API answers `first: n` with n+1 rows, so without trimming a caller
      // asking for 3 regimes gets 4 and offset paging double-counts the seam.
      mockGraphql.makeRequest.mockResolvedValue({
        experiences: {
          totalCount: 10,
          nodes: [
            { id: 'e1', name: 'CDPA' },
            { id: 'e2', name: 'CPA' },
            { id: 'e3', name: 'LGPD' },
            { id: 'e4', name: 'Unknown' },
          ],
        },
      });

      const tool = getTools().find((t) => t.name === 'consent_list_regimes')!;
      const result: any = await tool.handler({ limit: 3, offset: 0 });

      expect(result.data).toHaveLength(3);
      expect(result.data.map((n: any) => n.id)).toEqual(['e1', 'e2', 'e3']);
      expect(result.hasNextPage).toBe(true);
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

    it('forwards trackingTypes into filterBy', async () => {
      const variables = await runDataFlows({
        status: 'NEEDS_REVIEW',
        trackingTypes: ['Advertising', 'Analytics'],
      });
      expect(variables.filterBy.trackingTypes).toEqual(['Advertising', 'Analytics']);
    });

    it('zodSchema rejects empty trackingTypes', () => {
      const tool = getTools().find((t) => t.name === 'consent_list_data_flows')!;
      const result = tool.zodSchema.safeParse({ status: 'LIVE', trackingTypes: [] });
      expect(result.success).toBe(false);
    });

    it('forwards orderBy with a value tie-breaker when sorting by occurrences', async () => {
      const variables = await runDataFlows({
        status: 'NEEDS_REVIEW',
        orderField: 'occurrences',
        orderDirection: 'DESC',
      });
      expect(variables.orderBy).toEqual([
        { field: 'occurrences', direction: 'DESC' },
        { field: 'value', direction: 'ASC' },
      ]);
    });

    it('omits showZeroActivity by default for NEEDS_REVIEW so counts match inventory stats', async () => {
      const variables = await runDataFlows({ status: 'NEEDS_REVIEW' });
      expect(variables.filterBy).not.toHaveProperty('showZeroActivity');
    });

    it('defaults limit/offset and forwards limit as GraphQL `first`', async () => {
      const variables = await runDataFlows({ status: 'NEEDS_REVIEW' });
      expect(variables.first).toBe(50);
      expect(variables.offset).toBe(0);
    });
  });

  describe('consent_get_inventory_stats', () => {
    it('returns UI-matching data-flow counts from list totals (CSP omitted)', async () => {
      mockGraphql.makeRequest
        .mockResolvedValueOnce({
          consentManager: { consentManager: { id: 'bundle-1' } },
        })
        .mockResolvedValueOnce({
          cookieStats: { liveCount: 2, needReviewCount: 8, junkCount: 359 },
        })
        .mockResolvedValueOnce({
          dataFlows: { nodes: [], totalCount: 12 },
        })
        .mockResolvedValueOnce({
          dataFlows: { nodes: [], totalCount: 0 },
        })
        .mockResolvedValueOnce({
          dataFlows: { nodes: [], totalCount: 1 },
        });

      const tool = getTools().find((t) => t.name === 'consent_get_inventory_stats')!;
      const result = await tool.handler({});

      expect(result).toMatchObject({
        success: true,
        data: {
          cookies: { liveCount: 2, needReviewCount: 8, junkCount: 359 },
          dataFlows: {
            liveCount: 0,
            needReviewCount: 12,
            junkCount: 1,
          },
        },
      });
      expect((result.data as { dataFlows: Record<string, unknown> }).dataFlows).not.toHaveProperty(
        'csp',
      );

      // Bundle resolve + cookie stats + 3 UI-visible data-flow counts
      expect(mockGraphql.makeRequest).toHaveBeenCalledTimes(5);

      const countFilters = mockGraphql.makeRequest.mock.calls
        .slice(2)
        .map((call) => call[1].filterBy);
      expect(countFilters).toEqual([
        { status: 'NEEDS_REVIEW' },
        { status: 'LIVE', isJunk: false },
        { status: 'LIVE', isJunk: true },
      ]);
    });
  });

  describe('consent_cookie_triage_review_app', () => {
    it('fetches cookies, groups by purpose, and sets shownCount', async () => {
      mockGraphql.makeRequest
        .mockResolvedValueOnce({ organization: { name: 'Acme Corp' } })
        .mockResolvedValueOnce({ consentManager: { consentManager: { id: 'bundle-1' } } })
        .mockResolvedValueOnce({
          cookies: {
            totalCount: 2,
            nodes: [
              {
                id: 'c1',
                name: '_ga',
                trackingPurposes: ['Analytics'],
                occurrences: 10,
                lastDiscoveredAt: '2026-08-25T14:32:00.000Z',
                service: { title: 'Google Analytics' },
              },
              {
                id: 'c2',
                name: '_unknown',
                trackingPurposes: [],
                occurrences: 1,
              },
            ],
          },
        });

      const tool = getTools().find((t) => t.name === 'consent_cookie_triage_review_app')!;
      const result = await tool.handler(
        tool.zodSchema.parse({ triageType: ConsentTriageType.Cookies }),
      );

      expect(result).toMatchObject({
        success: true,
        data: {
          triageType: ConsentTriageType.Cookies,
          dashboardUrl: 'https://app.transcend.io',
          organizationName: 'Acme Corp',
          loaded: true,
          categories: [
            {
              purpose: CookieTriagePurposeCategory.Analytics,
              totalCount: 1,
              shownCount: 1,
              cookies: [
                {
                  name: '_ga',
                  service: 'Google Analytics',
                  lastActivityAt: '2026-08-25T14:32:00.000Z',
                },
              ],
            },
            {
              purpose: CookieTriagePurposeCategory.Unknown,
              totalCount: 1,
              shownCount: 1,
              cookies: [{ name: '_unknown' }],
            },
          ],
        },
      });
    });

    it('MCP App open returns a shell without GraphQL', async () => {
      const tool = getTools().find((t) => t.name === 'consent_cookie_triage_review_app')!;
      expect(isCapabilityAwareTool(tool)).toBe(true);
      if (!isCapabilityAwareTool(tool)) {
        return;
      }

      const appVariant = tool.variants[McpClientCapability.McpApp];
      expect(appVariant).toBeDefined();
      const result = await appVariant!.handler(
        tool.zodSchema.parse({ triageType: ConsentTriageType.DataFlows }),
      );

      expect(mockGraphql.makeRequest).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        success: true,
        data: {
          triageType: ConsentTriageType.DataFlows,
          dashboardUrl: 'https://app.transcend.io',
          organizationName: '',
          categories: [],
          loaded: false,
          message: expect.stringContaining(
            'Do not call consent_list_cookies or consent_list_data_flows.',
          ),
        },
      });
      expect(appVariant!.appOnlyTools ?? []).toEqual([]);
    });

    it('fetches data flows when triageType is data_flows', async () => {
      mockGraphql.makeRequest
        .mockResolvedValueOnce({ organization: { name: 'Acme Corp' } })
        .mockResolvedValueOnce({ consentManager: { consentManager: { id: 'bundle-1' } } })
        .mockResolvedValueOnce({
          dataFlows: {
            totalCount: 1,
            nodes: [
              {
                id: 'df1',
                value: 'cdn.example.com',
                trackingType: ['Advertising'],
                occurrences: 42,
                lastDiscoveredAt: '2026-08-20T00:00:00.000Z',
                service: { title: 'Example CDN' },
              },
            ],
          },
        });

      const tool = getTools().find((t) => t.name === 'consent_cookie_triage_review_app')!;
      const result = await tool.handler(
        tool.zodSchema.parse({ triageType: ConsentTriageType.DataFlows }),
      );

      expect(result).toMatchObject({
        success: true,
        data: {
          triageType: ConsentTriageType.DataFlows,
          dashboardUrl: 'https://app.transcend.io',
          organizationName: 'Acme Corp',
          loaded: true,
          categories: [
            {
              purpose: CookieTriagePurposeCategory.Advertising,
              totalCount: 1,
              shownCount: 1,
              cookies: [
                {
                  name: 'cdn.example.com',
                  id: 'df1',
                  service: 'Example CDN',
                  occurrences: 42,
                  lastActivityAt: '2026-08-20T00:00:00.000Z',
                },
              ],
            },
          ],
        },
      });
    });

    it('rejects unknown triageType values', () => {
      expect(CookieTriageAppSchema.safeParse({ triageType: 'both' }).success).toBe(false);
      expect(CookieTriageAppSchema.safeParse({}).success).toBe(false);
    });

    it('surfaces which fetch step failed', async () => {
      mockGraphql.makeRequest
        .mockResolvedValueOnce({ organization: { name: 'Acme Corp' } })
        .mockResolvedValueOnce({ consentManager: { consentManager: { id: 'bundle-1' } } })
        .mockRejectedValueOnce(new Error('cookies GraphQL boom'));

      const tool = getTools().find((t) => t.name === 'consent_cookie_triage_review_app')!;
      await expect(
        tool.handler(tool.zodSchema.parse({ triageType: ConsentTriageType.Cookies })),
      ).rejects.toThrow(
        /Failed to fetch cookies for consent triage \(cookies\): cookies GraphQL boom/,
      );
    });
  });

  describe('consent_list_cookies', () => {
    it('forwards orderBy with a name tie-breaker when sorting by occurrences', async () => {
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
      expect(variables.orderBy).toEqual([
        { field: 'occurrences', direction: 'DESC' },
        { field: 'name', direction: 'ASC' },
      ]);
    });

    it('forwards trackingPurposes into filterBy', async () => {
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
          trackingPurposes: ['Advertising', 'Analytics'],
        }),
      );
      const variables = mockGraphql.makeRequest.mock.calls[1][1];
      expect(variables.filterBy.trackingPurposes).toEqual(['Advertising', 'Analytics']);
    });

    it('zodSchema accepts occurrences as an orderField', () => {
      const tool = getTools().find((t) => t.name === 'consent_list_cookies')!;
      const result = tool.zodSchema.safeParse({ status: 'LIVE', orderField: 'occurrences' });
      expect(result.success).toBe(true);
    });

    it('zodSchema rejects empty trackingPurposes', () => {
      const tool = getTools().find((t) => t.name === 'consent_list_cookies')!;
      const result = tool.zodSchema.safeParse({ status: 'LIVE', trackingPurposes: [] });
      expect(result.success).toBe(false);
    });

    it('forwards lastDiscoveredAtBefore into filterBy', async () => {
      mockGraphql.makeRequest.mockResolvedValueOnce({
        consentManager: { consentManager: { id: 'bundle-1' } },
      });
      mockGraphql.makeRequest.mockResolvedValueOnce({
        cookies: { nodes: [], totalCount: 12 },
      });
      const tool = getTools().find((t) => t.name === 'consent_list_cookies')!;
      await tool.handler(
        tool.zodSchema.parse({
          status: 'NEEDS_REVIEW',
          first: 1,
          lastDiscoveredAtBefore: '2026-08-04T12:00:00.000Z',
        }),
      );
      const variables = mockGraphql.makeRequest.mock.calls[1][1];
      expect(variables.filterBy).toMatchObject({
        status: 'NEEDS_REVIEW',
        lastDiscoveredAtBefore: '2026-08-04T12:00:00.000Z',
      });
    });

    it('defaults limit/offset and forwards limit as GraphQL `first`', async () => {
      mockGraphql.makeRequest.mockResolvedValueOnce({
        consentManager: { consentManager: { id: 'bundle-1' } },
      });
      mockGraphql.makeRequest.mockResolvedValueOnce({
        cookies: { nodes: [], totalCount: 0 },
      });
      const tool = getTools().find((t) => t.name === 'consent_list_cookies')!;
      const parsed = tool.zodSchema.parse({ status: 'LIVE' });
      expect(parsed.limit).toBe(50);
      expect(parsed.offset).toBe(0);
      await tool.handler(parsed);
      const variables = mockGraphql.makeRequest.mock.calls[1][1];
      expect(variables.first).toBe(50);
      expect(variables.offset).toBe(0);
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

describe('inventory-stats MCP App document', () => {
  it('includes kit utilities so MetricCard and ProgressBar are not unstyled', () => {
    // Tailwind only emits these if discoverMcpAppViews @source'd mcp-ui-common.
    // A missed glob still bundles the components; they just render without CSS.
    expect(inventoryStatsHtml).toContain('bg-card');
    expect(inventoryStatsHtml).toContain('text-metric');
    expect(inventoryStatsHtml).toContain('bg-fill-success');
  });

  it('inlines component-owned Spinner CSS into the single document', () => {
    // Importing spinner.css must still produce no external asset: the shared
    // Vite build collects it into the document's style tag.
    expect(inventoryStatsHtml).toContain('@keyframes transcend-logo-spinner-trim');
    expect(inventoryStatsHtml).toContain('--transcend-logo-spinner-inner-rest');
  });

  it('caps the panel and stacks the metric cards on a narrow host', () => {
    // The cap comes from a theme token the view never names directly, so
    // dropping `--container-view` does not fail a build: Tailwind just stops
    // emitting the utility and the layout silently stretches across a
    // maximized panel.
    expect(inventoryStatsHtml).toMatch(/\.max-w-view\{max-width:var\(--container-view\)}/);
    // Columns key off the row's own width, not the viewport. A host sizes the
    // iframe to its panel, so a media query here would stack three cards that
    // had room to sit side by side.
    expect(inventoryStatsHtml).toContain('container-type:inline-size');
    expect(inventoryStatsHtml).toMatch(/@container \(width>=36rem\)\{[^{]*grid-cols-3\{/);
  });
});

describe('cookie-triage MCP App document', () => {
  it('includes cookie triage chrome and theme utilities', () => {
    expect(cookieTriageHtml).toContain('Could not reach the host');
    expect(cookieTriageHtml).toContain('Connecting to the host');
    expect(cookieTriageHtml).toContain('Show next');
    expect(cookieTriageHtml).toContain('All caught up');
    expect(cookieTriageHtml).toContain('Open in admin dashboard');
    expect(cookieTriageHtml).toContain('admin dashboard');
    expect(cookieTriageHtml).toMatch(/\.max-w-view\{max-width:var\(--container-view\)}/);
    expect(cookieTriageHtml).toContain('text-content-muted');
  });
});
