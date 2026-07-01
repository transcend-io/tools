import { readFileSync } from 'node:fs';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getDiscoveryTools } from '../src/tools.js';
import { packageVersion } from '../src/version.js';

const EXPECTED_TOOL_NAMES = [
  'discovery_classify_text',
  'discovery_ner_extract',
  'discovery_list_scans',
  'discovery_list_plugins',
] as const;

describe('Discovery Tools', () => {
  let mockGraphql: {
    listClassificationScans: ReturnType<typeof vi.fn>;
    listDiscoveryPlugins: ReturnType<typeof vi.fn>;
  };

  let mockRest: {
    classifyText: ReturnType<typeof vi.fn>;
    nerExtract: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphql = {
      listClassificationScans: vi.fn(),
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

  it('registers exactly 4 tools with expected names', () => {
    const tools = getTools();
    expect(tools).toHaveLength(4);
    expect(tools.map((t) => t.name)).toEqual([...EXPECTED_TOOL_NAMES]);
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

describe('server metadata', () => {
  it('uses the package version for MCP server metadata', () => {
    const packageJson = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { version: string };

    expect(packageVersion).toBe(packageJson.version);
  });
});
