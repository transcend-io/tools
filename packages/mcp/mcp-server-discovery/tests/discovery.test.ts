import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getDiscoveryTools } from '../src/tools.js';

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
    extractEntities: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphql = {
      listClassificationScans: vi.fn(),
      listDiscoveryPlugins: vi.fn(),
    };
    mockRest = {
      classifyText: vi.fn(),
      extractEntities: vi.fn(),
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

  describe('discovery_classify_text', () => {
    it('zodSchema rejects when categories are missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'discovery_classify_text')!;

      const result = tool.zodSchema.safeParse({ texts: ['hello'] });
      expect(result.success).toBe(false);
    });

    it('returns mapped classification results on success', async () => {
      mockRest.classifyText.mockResolvedValue([
        {
          text: 'contact me at a@b.com',
          classifications: [{ category: 'EMAIL', confidence: 0.95, subcategory: 'Contact' }],
        },
      ]);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'discovery_classify_text')!;

      const result = await tool.handler({
        texts: ['contact me at a@b.com'],
        categories: ['EMAIL', 'PHONE'],
      });

      expect(result).toMatchObject({
        success: true,
        data: {
          results: [
            {
              text: 'contact me at a@b.com',
              classifications: [{ category: 'EMAIL', confidence: 0.95, subcategory: 'Contact' }],
            },
          ],
          inputCount: 1,
        },
      });
      expect(mockRest.classifyText).toHaveBeenCalledWith({
        texts: ['contact me at a@b.com'],
        categories: ['EMAIL', 'PHONE'],
        model: undefined,
      });
    });
  });

  describe('discovery_ner_extract', () => {
    it('zodSchema rejects when entityTypes are missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'discovery_ner_extract')!;

      const result = tool.zodSchema.safeParse({ text: 'hello' });
      expect(result.success).toBe(false);
    });

    it('returns extracted entities on success', async () => {
      mockRest.extractEntities.mockResolvedValue({
        entities: [{ text: 'a@b.com', type: 'Email', confidence: 0.9, snippet: 'a@b.com' }],
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'discovery_ner_extract')!;

      const result = await tool.handler({
        text: 'email me at a@b.com',
        entityTypes: ['Email'],
      });

      expect(result).toMatchObject({
        success: true,
        data: {
          entities: [{ text: 'a@b.com', type: 'Email', confidence: 0.9, snippet: 'a@b.com' }],
          entityCount: 1,
          entityTypes: ['Email'],
        },
      });
    });
  });
});
