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
      graphql: mockGraphql as never,
      dashboardUrl: 'https://app.transcend.io',
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

      const result = await tool.handler({ limit: 10, offset: 0 });

      expect(result).toMatchObject({
        success: true,
        data: nodes,
        count: 1,
        totalCount: 1,
      });
      expect(mockGraphql.listDataSilos).toHaveBeenCalledWith({
        first: 10,
        offset: 0,
      });
    });

    it('forwards offset for pagination', async () => {
      mockGraphql.listDataSilos.mockResolvedValue({
        nodes: [],
        totalCount: 261,
        pageInfo: { hasNextPage: false, hasPreviousPage: true },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_data_silos')!;

      await tool.handler({ limit: 100, offset: 100 });

      expect(mockGraphql.listDataSilos).toHaveBeenCalledWith({
        first: 100,
        offset: 100,
      });
    });

    it('throws when client throws', async () => {
      mockGraphql.listDataSilos.mockRejectedValue(new Error('GraphQL error'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_data_silos')!;

      await expect(tool.handler({})).rejects.toThrow('GraphQL error');
    });
  });

  describe('inventory_analyze', () => {
    it('reports fully paginated totals and breakdowns, not capped page lengths', async () => {
      // `inventory_analyze` calls each list* with `{ all: true }`; the mocks
      // return the fully-paginated result set as a single page.
      const allPages = <T>(nodes: T[]) => ({
        nodes,
        totalCount: nodes.length,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });
      // Simulate an org with >100 of several entity types.
      mockGraphql.listDataSilos.mockResolvedValue(
        allPages([
          { id: '1', title: 'A', type: 'database', isLive: true },
          { id: '2', title: 'B', type: 'database', isLive: false, outerType: 'sombra' },
          { id: '3', title: 'C', type: 'api', isLive: true },
        ]),
      );
      mockGraphql.listVendors.mockResolvedValue(
        allPages(Array.from({ length: 150 }, (_, i) => ({ id: String(i), title: `V${i}` }))),
      );
      mockGraphql.listIdentifiers.mockResolvedValue(
        allPages([{ id: 'e', name: 'email', type: 'EMAIL', isRequiredInForm: true }]),
      );
      mockGraphql.listDataCategories.mockResolvedValue(
        allPages(Array.from({ length: 250 }, (_, i) => ({ name: `Cat${i}`, category: 'CONTACT' }))),
      );

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_analyze')!;

      const result = (await tool.handler({})) as {
        success: boolean;
        data: {
          summary: {
            totalDataSilos: number;
            liveDataSilos: number;
            totalVendors: number;
            totalIdentifiers: number;
            totalCategories: number;
          };
          breakdown: {
            dataSilosByType: Record<string, number>;
            dataSilosByOuterType: Record<string, number>;
          };
          topIdentifiers: { name: string; type: string; isRequired?: boolean }[];
        };
      };

      expect(result.success).toBe(true);
      expect(result.data.summary).toMatchObject({
        totalDataSilos: 3,
        liveDataSilos: 2,
        totalVendors: 150,
        totalIdentifiers: 1,
        totalCategories: 250,
      });
      expect(result.data.breakdown.dataSilosByType).toEqual({ database: 2, api: 1 });
      expect(result.data.breakdown.dataSilosByOuterType).toEqual({ sombra: 1 });
      expect(result.data.topIdentifiers[0]).toEqual({
        name: 'email',
        type: 'EMAIL',
        isRequired: true,
      });
    });
  });
});
