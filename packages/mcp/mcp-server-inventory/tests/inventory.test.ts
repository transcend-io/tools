import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getInventoryTools } from '../src/tools.js';

const EXPECTED_TOOL_NAMES = [
  'inventory_list_data_silos',
  'inventory_get_data_silo',
  'inventory_create_data_silo',
  'inventory_update_data_silo',
  'inventory_list_vendors',
  'inventory_list_data_points',
  'inventory_list_sub_data_points',
  'inventory_list_identifiers',
  'inventory_list_categories',
  'inventory_analyze',
] as const;

describe('Inventory Tools', () => {
  let mockGraphql: {
    listDataSilos: ReturnType<typeof vi.fn>;
    getDataSilo: ReturnType<typeof vi.fn>;
    createDataSilo: ReturnType<typeof vi.fn>;
    updateDataSilo: ReturnType<typeof vi.fn>;
    listVendors: ReturnType<typeof vi.fn>;
    listDataPoints: ReturnType<typeof vi.fn>;
    listSubDataPoints: ReturnType<typeof vi.fn>;
    listIdentifiers: ReturnType<typeof vi.fn>;
    listDataCategories: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphql = {
      listDataSilos: vi.fn(),
      getDataSilo: vi.fn(),
      createDataSilo: vi.fn(),
      updateDataSilo: vi.fn(),
      listVendors: vi.fn(),
      listDataPoints: vi.fn(),
      listSubDataPoints: vi.fn(),
      listIdentifiers: vi.fn(),
      listDataCategories: vi.fn(),
    };
  });

  const getTools = () =>
    getInventoryTools({
      rest: {} as never,
      graphql: mockGraphql,
    });

  it('registers exactly 10 tools with expected names', () => {
    const tools = getTools();
    expect(tools).toHaveLength(10);
    expect(tools.map((t) => t.name)).toEqual([...EXPECTED_TOOL_NAMES]);
  });

  describe('inventory_get_data_silo', () => {
    it('zodSchema rejects when data_silo_id is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_get_data_silo')!;

      const result = tool.zodSchema.safeParse({});
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['data_silo_id']);
    });

    it('returns data silo on success', async () => {
      const detail = {
        id: 'silo-1',
        title: 'Salesforce',
        type: 'api' as const,
        isLive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      mockGraphql.getDataSilo.mockResolvedValue(detail);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_get_data_silo')!;

      const result = await tool.handler({ data_silo_id: 'silo-1' });

      expect(result).toMatchObject({ success: true, data: detail });
      expect(mockGraphql.getDataSilo).toHaveBeenCalledWith('silo-1');
    });
  });

  describe('inventory_list_data_silos', () => {
    it('returns list on success', async () => {
      const nodes = [{ id: '1', title: 'A', type: 'api' as const }];
      mockGraphql.listDataSilos.mockResolvedValue({
        nodes,
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_data_silos')!;

      const result = await tool.handler({ limit: 10 });

      expect(result).toMatchObject({
        success: true,
        data: nodes,
        count: 1,
        totalCount: 1,
      });
      expect(mockGraphql.listDataSilos).toHaveBeenCalledWith({
        first: 10,
        after: undefined,
      });
    });

    it('returns error when client throws', async () => {
      mockGraphql.listDataSilos.mockRejectedValue(new Error('GraphQL error'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_data_silos')!;

      const result = await tool.handler({});

      expect(result).toMatchObject({
        success: false,
        error: 'GraphQL error',
      });
    });
  });
});
