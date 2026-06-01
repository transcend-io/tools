import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getDiscoveryTools } from '../src/tools.js';

const EXPECTED_TOOL_NAMES = [
  'discovery_classify_text',
  'discovery_ner_extract',
  'discovery_list_scans',
  'discovery_start_scan',
  'discovery_get_scan',
  'discovery_list_plugins',
] as const;

describe('Discovery Tools', () => {
  let mockGraphql: {
    listClassificationScans: ReturnType<typeof vi.fn>;
    startClassificationScan: ReturnType<typeof vi.fn>;
    getClassificationScan: ReturnType<typeof vi.fn>;
    listDiscoveryPlugins: ReturnType<typeof vi.fn>;
  };

  let mockRest: {
    classifyText: ReturnType<typeof vi.fn>;
    nerExtract: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphql = {
      listClassificationScans: vi.fn(),
      startClassificationScan: vi.fn(),
      getClassificationScan: vi.fn(),
      listDiscoveryPlugins: vi.fn(),
    };
    mockRest = {
      classifyText: vi.fn(),
      nerExtract: vi.fn(),
    };
  });

  const getTools = () =>
    getDiscoveryTools({
      rest: mockRest as never,
      graphql: mockGraphql as never,
      dashboardUrl: 'https://app.transcend.io',
    });

  it('registers exactly 6 tools with expected names', () => {
    const tools = getTools();
    expect(tools).toHaveLength(6);
    expect(tools.map((t) => t.name)).toEqual([...EXPECTED_TOOL_NAMES]);
  });

  describe('discovery_get_scan', () => {
    it('zodSchema rejects input when scan_id is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'discovery_get_scan')!;

      const result = tool.zodSchema.safeParse({});

      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['scan_id']);
    });

    it('returns scan on success', async () => {
      const scan = {
        id: 'scan-1',
        name: 'Test Scan',
        type: 'classification',
        status: 'COMPLETED',
        createdAt: '2024-01-01',
      };
      mockGraphql.getClassificationScan.mockResolvedValue(scan);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'discovery_get_scan')!;

      const result = await tool.handler({ scan_id: 'scan-1' });

      expect(result).toMatchObject({ success: true, data: scan });
      expect(mockGraphql.getClassificationScan).toHaveBeenCalledWith('scan-1');
    });
  });

  describe('discovery_list_scans', () => {
    it('returns list on success', async () => {
      const nodes = [{ id: 's1', name: 'Scan A', type: 'classification', status: 'COMPLETED' }];
      mockGraphql.listClassificationScans.mockResolvedValue({
        nodes,
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'discovery_list_scans')!;

      const result = await tool.handler({});

      expect(result).toMatchObject({ success: true, data: nodes, totalCount: 1 });
    });

    it('throws when client throws', async () => {
      mockGraphql.listClassificationScans.mockRejectedValue(new Error('API error'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'discovery_list_scans')!;

      await expect(tool.handler({})).rejects.toThrow('API error');
    });
  });
});
