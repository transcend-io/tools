import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getConsentTools } from '../src/tools.js';

const EXPECTED_TOOL_NAMES = [
  'consent_get_preferences',
  'consent_set_preferences',
  'consent_list_purposes',
  'consent_list_data_flows',
  'consent_list_airgap_bundles',
  'consent_list_regimes',
  'consent_list_triage_cookies',
  'consent_list_triage_data_flows',
  'consent_get_triage_stats',
  'consent_update_cookies',
  'consent_update_data_flows',
  'consent_bulk_triage',
] as const;

describe('Consent Tools', () => {
  let mockGraphql: {
    listAirgapBundles: ReturnType<typeof vi.fn>;
    listTrackingPurposes: ReturnType<typeof vi.fn>;
    listDataFlows: ReturnType<typeof vi.fn>;
    listCookies: ReturnType<typeof vi.fn>;
    listConsentDataFlows: ReturnType<typeof vi.fn>;
    getCookieStats: ReturnType<typeof vi.fn>;
    updateCookies: ReturnType<typeof vi.fn>;
    updateConsentDataFlows: ReturnType<typeof vi.fn>;
    deleteCookies: ReturnType<typeof vi.fn>;
    deleteConsentDataFlows: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphql = {
      listAirgapBundles: vi.fn(),
      listTrackingPurposes: vi.fn(),
      listDataFlows: vi.fn(),
      listCookies: vi.fn(),
      listConsentDataFlows: vi.fn(),
      getCookieStats: vi.fn(),
      updateCookies: vi.fn(),
      updateConsentDataFlows: vi.fn(),
      deleteCookies: vi.fn(),
      deleteConsentDataFlows: vi.fn(),
    };
  });

  const getTools = () =>
    getConsentTools({
      rest: {} as never,
      graphql: mockGraphql,
    });

  it('registers exactly 12 tools with expected names', () => {
    const tools = getTools();
    expect(tools).toHaveLength(12);
    expect(tools.map((t) => t.name)).toEqual([...EXPECTED_TOOL_NAMES]);
  });

  describe('consent_update_cookies', () => {
    it('zodSchema rejects input when required fields are missing', async () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'consent_update_cookies')!;

      const parseResult = tool.zodSchema.safeParse({});
      expect(parseResult.success).toBe(false);
      expect(mockGraphql.updateCookies).not.toHaveBeenCalled();
    });
  });

  describe('consent_list_purposes', () => {
    it('returns list on success', async () => {
      const nodes = [{ id: 'p1', name: 'Analytics', trackingType: 'ANALYTICS' }];
      mockGraphql.listTrackingPurposes.mockResolvedValue({
        nodes,
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'consent_list_purposes')!;

      const result = await tool.handler({});

      expect(result).toMatchObject({ success: true, data: nodes, totalCount: 1 });
    });

    it('returns error when client throws', async () => {
      mockGraphql.listTrackingPurposes.mockRejectedValue(new Error('GraphQL error'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'consent_list_purposes')!;

      const result = await tool.handler({});

      expect(result).toMatchObject({ success: false, error: 'GraphQL error' });
    });
  });
});
