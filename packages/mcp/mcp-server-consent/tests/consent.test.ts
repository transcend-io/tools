import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getConsentTools } from '../src/tools.js';

const EXPECTED_TOOL_NAMES = [
  'consent_get_preferences',
  'consent_set_preferences',
  'consent_list_purposes',
  'consent_list_data_flows',
  'consent_list_cookies',
  'consent_list_airgap_bundles',
  'consent_list_regimes',
  'consent_get_triage_stats',
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
    });

  it(`registers exactly ${EXPECTED_TOOL_NAMES.length} tools with expected names`, () => {
    const tools = getTools();
    expect(tools).toHaveLength(EXPECTED_TOOL_NAMES.length);
    expect(tools.map((t) => t.name)).toEqual([...EXPECTED_TOOL_NAMES]);
  });

  describe('consent_update_cookies', () => {
    it('returns validation error when required fields are missing', async () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'consent_update_cookies')!;

      const result = await tool.handler({});

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid input'),
      });
      expect(mockGraphql.makeRequest).not.toHaveBeenCalled();
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

      const result = await tool.handler({});

      expect(result).toMatchObject({ success: false, error: 'GraphQL error' });
    });
  });
});
