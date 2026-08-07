import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getInventoryTools } from '../src/tools.js';

const EXPECTED_TOOL_NAMES = [
  'inventory_list_data_silos',
  'inventory_get_data_silo',
  'inventory_create_data_silo',
  'inventory_update_data_silo',
  'inventory_list_vendors',
  'inventory_write_vendor',
  'inventory_list_data_points',
  'inventory_list_sub_data_points',
  'inventory_list_identifiers',
  'inventory_list_categories',
  'inventory_list_processing_purposes',
  'inventory_write_processing_purpose',
  'inventory_list_business_entities',
  'inventory_list_data_subjects',
  'inventory_analyze',
] as const;

describe('Inventory Tools', () => {
  let mockGraphql: {
    listDataSilos: ReturnType<typeof vi.fn>;
    getDataSilo: ReturnType<typeof vi.fn>;
    createDataSilo: ReturnType<typeof vi.fn>;
    updateDataSilo: ReturnType<typeof vi.fn>;
    listVendors: ReturnType<typeof vi.fn>;
    writeVendor: ReturnType<typeof vi.fn>;
    listDataPoints: ReturnType<typeof vi.fn>;
    listSubDataPoints: ReturnType<typeof vi.fn>;
    listIdentifiers: ReturnType<typeof vi.fn>;
    listDataCategories: ReturnType<typeof vi.fn>;
    listProcessingPurposes: ReturnType<typeof vi.fn>;
    writeProcessingPurpose: ReturnType<typeof vi.fn>;
    listBusinessEntities: ReturnType<typeof vi.fn>;
    listDataSubjects: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphql = {
      listDataSilos: vi.fn(),
      getDataSilo: vi.fn(),
      createDataSilo: vi.fn(),
      updateDataSilo: vi.fn(),
      listVendors: vi.fn(),
      writeVendor: vi.fn(),
      listDataPoints: vi.fn(),
      listSubDataPoints: vi.fn(),
      listIdentifiers: vi.fn(),
      listDataCategories: vi.fn(),
      listProcessingPurposes: vi.fn(),
      writeProcessingPurpose: vi.fn(),
      listBusinessEntities: vi.fn(),
      listDataSubjects: vi.fn(),
    };
  });

  const getTools = () =>
    getInventoryTools({
      rest: {} as never,
      graphql: mockGraphql as never,
      dashboardUrl: 'https://app.transcend.io',
    });

  it('registers exactly 15 tools with expected names', () => {
    const tools = getTools();
    expect(tools).toHaveLength(15);
    expect(tools.map((t) => t.name)).toEqual([...EXPECTED_TOOL_NAMES]);
  });

  describe('inventory_get_data_silo', () => {
    it('zodSchema rejects when dataSiloId is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_get_data_silo')!;

      const result = tool.zodSchema.safeParse({});
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['dataSiloId']);
    });

    it('returns enriched data silo details on success', async () => {
      const detail = {
        id: 'silo-1',
        title: 'Salesforce',
        type: 'api' as const,
        isLive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        notes: 'note',
        vendor: { id: 'v-1', title: 'Acme' },
        processingPurposeSubCategories: [{ id: 'pp-1', name: 'Other', purpose: 'ESSENTIAL' }],
        subjects: [{ id: 'sub-1', type: 'customer', title: 'Customer' }],
      };
      mockGraphql.getDataSilo.mockResolvedValue(detail);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_get_data_silo')!;

      const result = await tool.handler({ dataSiloId: 'silo-1' });

      expect(result).toMatchObject({ success: true, data: detail });
      expect(mockGraphql.getDataSilo).toHaveBeenCalledWith('silo-1');
    });
  });

  describe('inventory_update_data_silo', () => {
    it('forwards extended Data Systems fields', async () => {
      mockGraphql.updateDataSilo.mockResolvedValue({
        id: 'silo-1',
        title: 'Salesforce',
        type: 'api',
        isLive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_update_data_silo')!;

      await tool.handler({
        dataSiloId: 'silo-1',
        title: 'Salesforce',
        ownerEmails: ['a@example.com'],
        vendorId: 'v-1',
        processingPurposeSubCategoryIds: ['pp-1'],
        dataSubjectBlockListIds: ['sub-1'],
        businessEntityTitles: ['Acme Corp'],
        notes: 'updated',
      });

      expect(mockGraphql.updateDataSilo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'silo-1',
          title: 'Salesforce',
          ownerEmails: ['a@example.com'],
          vendorId: 'v-1',
          processingPurposeSubCategoryIds: ['pp-1'],
          dataSubjectBlockListIds: ['sub-1'],
          businessEntityTitles: ['Acme Corp'],
          notes: 'updated',
        }),
      );
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

  describe('inventory_list_data_points', () => {
    it('forwards dataSiloId when provided', async () => {
      mockGraphql.listDataPoints.mockResolvedValue({
        nodes: [{ id: 'dp-1', name: 'users', dataSiloId: 'silo-1' }],
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_data_points')!;

      await tool.handler({ dataSiloId: 'silo-1', limit: 25, offset: 0 });

      expect(mockGraphql.listDataPoints).toHaveBeenCalledWith('silo-1', {
        first: 25,
        offset: 0,
      });
    });

    it('passes undefined dataSiloId when omitted', async () => {
      mockGraphql.listDataPoints.mockResolvedValue({
        nodes: [],
        totalCount: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_data_points')!;

      await tool.handler({ limit: 10, offset: 0 });

      expect(mockGraphql.listDataPoints).toHaveBeenCalledWith(undefined, {
        first: 10,
        offset: 0,
      });
    });
  });

  describe('inventory_list_vendors', () => {
    it('returns vendor list from graphql mixin', async () => {
      const nodes = [
        {
          id: 'v-1',
          title: 'Acme',
          contactEmail: 'pat@example.com',
          websiteUrl: 'https://acme.example',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      mockGraphql.listVendors.mockResolvedValue({
        nodes,
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_vendors')!;

      const result = await tool.handler({ limit: 10, offset: 0 });

      expect(result).toMatchObject({ success: true, data: nodes, count: 1 });
      expect(mockGraphql.listVendors).toHaveBeenCalledWith({ first: 10, offset: 0 });
    });
  });

  describe('inventory_list_sub_data_points', () => {
    it('returns fields including purposes and categories', async () => {
      const nodes = [
        {
          id: 'sdp-1',
          name: 'email',
          purposes: [{ id: 'pp-1', name: 'Other', purpose: 'ESSENTIAL' }],
          categories: [{ id: 'c-1', name: 'Email', category: 'CONTACT' }],
        },
      ];
      mockGraphql.listSubDataPoints.mockResolvedValue({
        nodes,
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_sub_data_points')!;

      const result = await tool.handler({ dataPointId: 'dp-1', limit: 10, offset: 0 });

      expect(result).toMatchObject({ success: true, data: nodes, count: 1 });
      expect(mockGraphql.listSubDataPoints).toHaveBeenCalledWith('dp-1', {
        first: 10,
        offset: 0,
      });
    });
  });

  describe('inventory_list_business_entities', () => {
    it('returns list on success', async () => {
      const nodes = [{ id: 'be-1', title: 'Acme Corp' }];
      mockGraphql.listBusinessEntities.mockResolvedValue({
        nodes,
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_business_entities')!;

      const result = await tool.handler({ limit: 10, offset: 0 });

      expect(result).toMatchObject({ success: true, data: nodes, count: 1 });
      expect(mockGraphql.listBusinessEntities).toHaveBeenCalledWith({
        first: 10,
        offset: 0,
      });
    });
  });

  describe('inventory_list_data_subjects', () => {
    it('returns full subject list', async () => {
      const nodes = [{ id: 'sub-1', type: 'CUSTOMER', title: 'Customer', active: true }];
      mockGraphql.listDataSubjects.mockResolvedValue({
        nodes,
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_data_subjects')!;

      const result = await tool.handler({});

      expect(result).toMatchObject({ success: true, data: nodes, count: 1 });
      expect(mockGraphql.listDataSubjects).toHaveBeenCalledWith();
    });
  });

  describe('inventory_list_processing_purposes', () => {
    it('returns list on success', async () => {
      const nodes = [
        { id: 'pp-1', name: 'Other', purpose: 'ESSENTIAL', description: 'Essential processing' },
      ];
      mockGraphql.listProcessingPurposes.mockResolvedValue({
        nodes,
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_processing_purposes')!;

      const result = await tool.handler({ limit: 10, offset: 0 });

      expect(result).toMatchObject({
        success: true,
        data: nodes,
        count: 1,
        totalCount: 1,
      });
      expect(mockGraphql.listProcessingPurposes).toHaveBeenCalledWith({
        first: 10,
        offset: 0,
      });
    });
  });

  describe('inventory_write_processing_purpose', () => {
    it('upserts by name and purpose', async () => {
      const processingPurpose = {
        id: 'pp-1',
        name: 'Other',
        purpose: 'ESSENTIAL',
        description: 'Essential',
      };
      mockGraphql.writeProcessingPurpose.mockResolvedValue({
        processingPurpose,
        created: true,
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_write_processing_purpose')!;

      const result = await tool.handler({ name: 'Other', purpose: 'ESSENTIAL' });

      expect(result).toMatchObject({
        success: true,
        data: { processingPurpose, created: true },
      });
      expect(mockGraphql.writeProcessingPurpose).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Other', purpose: 'ESSENTIAL' }),
      );
    });

    it('updates by id', async () => {
      const processingPurpose = {
        id: 'pp-1',
        name: 'Other',
        purpose: 'ESSENTIAL',
        description: 'Updated',
      };
      mockGraphql.writeProcessingPurpose.mockResolvedValue({
        processingPurpose,
        created: false,
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_write_processing_purpose')!;

      await tool.handler({ id: 'pp-1', description: 'Updated' });

      expect(mockGraphql.writeProcessingPurpose).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'pp-1', description: 'Updated' }),
      );
    });

    it('zodSchema rejects when neither id nor name+purpose provided', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_write_processing_purpose')!;

      const result = tool.zodSchema.safeParse({ description: 'only description' });
      expect(result.success).toBe(false);
    });
  });

  describe('inventory_write_vendor', () => {
    it('upserts a vendor by title', async () => {
      const vendor = {
        id: 'v-1',
        title: 'Acme',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      mockGraphql.writeVendor.mockResolvedValue({ vendor, created: true });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_write_vendor')!;

      const result = await tool.handler({ title: 'Acme' });

      expect(result).toMatchObject({
        success: true,
        data: { vendor, created: true },
      });
      expect(mockGraphql.writeVendor).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Acme', id: undefined }),
      );
    });

    it('updates by vendorId', async () => {
      const vendor = {
        id: 'v-1',
        title: 'Acme',
        description: 'Updated',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      mockGraphql.writeVendor.mockResolvedValue({ vendor, created: false });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_write_vendor')!;

      await tool.handler({ vendorId: 'v-1', description: 'Updated' });

      expect(mockGraphql.writeVendor).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'v-1', description: 'Updated' }),
      );
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
