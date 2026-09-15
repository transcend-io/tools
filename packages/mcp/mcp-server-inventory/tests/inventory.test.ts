import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getInventoryTools } from '../src/tools.js';

const EXPECTED_TOOL_NAMES = [
  'inventory_list_data_silos',
  'inventory_get_data_silo',
  'inventory_list_catalog_integrations',
  'inventory_write_data_silo',
  'inventory_list_vendors',
  'inventory_write_vendor',
  'inventory_list_data_points',
  'inventory_update_or_create_data_point',
  'inventory_list_sub_data_points',
  'inventory_list_identifiers',
  'inventory_list_categories',
  'inventory_write_category',
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
    listCatalogs: ReturnType<typeof vi.fn>;
    writeDataSilo: ReturnType<typeof vi.fn>;
    listVendors: ReturnType<typeof vi.fn>;
    writeVendor: ReturnType<typeof vi.fn>;
    listDataPoints: ReturnType<typeof vi.fn>;
    updateOrCreateDataPoint: ReturnType<typeof vi.fn>;
    listSubDataPoints: ReturnType<typeof vi.fn>;
    listIdentifiers: ReturnType<typeof vi.fn>;
    listDataCategories: ReturnType<typeof vi.fn>;
    writeDataCategory: ReturnType<typeof vi.fn>;
    listProcessingPurposes: ReturnType<typeof vi.fn>;
    writeProcessingPurpose: ReturnType<typeof vi.fn>;
    listBusinessEntities: ReturnType<typeof vi.fn>;
    listDataSubjects: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphql = {
      listDataSilos: vi.fn(),
      getDataSilo: vi.fn(),
      listCatalogs: vi.fn(),
      writeDataSilo: vi.fn(),
      listVendors: vi.fn(),
      writeVendor: vi.fn(),
      listDataPoints: vi.fn(),
      updateOrCreateDataPoint: vi.fn(),
      listSubDataPoints: vi.fn(),
      listIdentifiers: vi.fn(),
      listDataCategories: vi.fn(),
      writeDataCategory: vi.fn(),
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

  it('registers exactly 17 tools with expected names', () => {
    const tools = getTools();
    expect(tools).toHaveLength(17);
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

  describe('inventory_write_data_silo', () => {
    it('creates by integrationName', async () => {
      const dataSilo = {
        id: 'silo-new',
        title: 'Salesforce',
        type: 'api' as const,
        isLive: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      mockGraphql.writeDataSilo.mockResolvedValue({ dataSilo, created: true });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_write_data_silo')!;

      const result = await tool.handler({
        integrationName: 'salesforce',
        title: 'Salesforce',
        ownerEmails: ['a@example.com'],
      });

      expect(result).toMatchObject({
        success: true,
        data: { dataSilo, created: true },
      });
      expect(mockGraphql.writeDataSilo).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationName: 'salesforce',
          title: 'Salesforce',
          ownerEmails: ['a@example.com'],
        }),
      );
    });

    it('updates by dataSiloId', async () => {
      const dataSilo = {
        id: 'silo-1',
        title: 'Salesforce',
        type: 'api' as const,
        isLive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      mockGraphql.writeDataSilo.mockResolvedValue({ dataSilo, created: false });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_write_data_silo')!;

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

      expect(mockGraphql.writeDataSilo).toHaveBeenCalledWith(
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

    it('zodSchema rejects when neither dataSiloId nor integrationName provided', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_write_data_silo')!;

      const result = tool.zodSchema.safeParse({ title: 'only title' });
      expect(result.success).toBe(false);
    });
  });

  describe('inventory_list_data_silos', () => {
    const listTool = () => getTools().find((t) => t.name === 'inventory_list_data_silos')!;

    const page = <T>(nodes: T[], totalCount = nodes.length) => ({
      nodes,
      totalCount,
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    });

    it('returns owners and teams on every row without a detail read', async () => {
      const nodes = [
        {
          id: '1',
          title: 'A',
          type: 'api' as const,
          owners: [{ id: 'u1', email: 'dan@example.com', name: 'Dan' }],
          teams: [{ id: 't1', name: 'Privacy' }],
        },
      ];
      mockGraphql.listDataSilos.mockResolvedValue(page(nodes));

      const tool = listTool();
      const result = await tool.handler(tool.zodSchema.parse({ limit: 10, offset: 0 }) as never);

      expect(result).toMatchObject({
        success: true,
        data: nodes,
        count: 1,
        totalCount: 1,
      });
      expect(mockGraphql.getDataSilo).not.toHaveBeenCalled();
      expect(mockGraphql.listDataSilos).toHaveBeenCalledWith(
        expect.objectContaining({ first: 10, offset: 0, includeDetails: false }),
      );
    });

    it('forwards text and titles filters', async () => {
      mockGraphql.listDataSilos.mockResolvedValue(page([], 1));

      const tool = listTool();
      await tool.handler(
        tool.zodSchema.parse({ text: 'ZEL8168', titles: ['Acme'], limit: 10, offset: 0 }) as never,
      );

      expect(mockGraphql.listDataSilos).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'ZEL8168', titles: ['Acme'] }),
      );
    });

    it('forwards the ownership filters', async () => {
      mockGraphql.listDataSilos.mockResolvedValue(page([], 1));

      const tool = listTool();
      await tool.handler(
        tool.zodSchema.parse({
          ownerIds: ['u1'],
          teamIds: ['t1'],
          types: ['googleCloudPlatform'],
          limit: 10,
          offset: 0,
        }) as never,
      );

      expect(mockGraphql.listDataSilos).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerIds: ['u1'],
          teamIds: ['t1'],
          types: ['googleCloudPlatform'],
        }),
      );
    });

    it('forwards unassignedOnly for unowned-system triage', async () => {
      mockGraphql.listDataSilos.mockResolvedValue(page([], 1));

      const tool = listTool();
      await tool.handler(tool.zodSchema.parse({ unassignedOnly: true }) as never);

      expect(mockGraphql.listDataSilos).toHaveBeenCalledWith(
        expect.objectContaining({ unassignedOnly: true }),
      );
    });

    it('forwards includeDetails and the mapped sort field', async () => {
      mockGraphql.listDataSilos.mockResolvedValue(page([], 1));

      const tool = listTool();
      await tool.handler(
        tool.zodSchema.parse({
          includeDetails: true,
          sortBy: 'title',
          sortDirection: 'DESC',
        }) as never,
      );

      expect(mockGraphql.listDataSilos).toHaveBeenCalledWith(
        expect.objectContaining({
          includeDetails: true,
          sortField: 'title',
          sortDirection: 'DESC',
        }),
      );
    });

    it('omits sort plumbing when sortBy is absent', async () => {
      mockGraphql.listDataSilos.mockResolvedValue(page([], 1));

      const tool = listTool();
      await tool.handler(tool.zodSchema.parse({}) as never);

      const [args] = mockGraphql.listDataSilos.mock.calls[0];
      expect(args).not.toHaveProperty('sortField');
    });

    it('forwards offset for pagination', async () => {
      mockGraphql.listDataSilos.mockResolvedValue(page([], 261));

      const tool = listTool();
      await tool.handler(tool.zodSchema.parse({ limit: 100, offset: 100 }) as never);

      expect(mockGraphql.listDataSilos).toHaveBeenCalledWith(
        expect.objectContaining({ first: 100, offset: 100 }),
      );
    });

    it('rejects an array filter resolved to nothing rather than listing every system', () => {
      const tool = listTool();
      expect(tool.zodSchema.safeParse({ ownerIds: [] }).success).toBe(false);
      expect(tool.zodSchema.safeParse({ types: [] }).success).toBe(false);
      expect(tool.zodSchema.safeParse({ titles: [] }).success).toBe(false);
    });

    it('rejects a sortBy the API cannot order on', () => {
      expect(listTool().zodSchema.safeParse({ sortBy: 'ownerName' }).success).toBe(false);
    });

    it('rejects a date bound that is not ISO 8601', () => {
      const tool = listTool();
      expect(tool.zodSchema.safeParse({ createdAfter: 'last friday' }).success).toBe(false);
      expect(tool.zodSchema.safeParse({ createdAfter: '2026-01-31' }).success).toBe(true);
    });

    it('errors on an offset past the end instead of returning an empty page', async () => {
      mockGraphql.listDataSilos.mockResolvedValue(page([], 269));

      const tool = listTool();
      await expect(
        tool.handler(tool.zodSchema.parse({ limit: 50, offset: 300 }) as never),
      ).rejects.toThrow(/past the end/);
    });

    it('hands back the next offset, so triaging 269 silos needs no arithmetic', async () => {
      mockGraphql.listDataSilos.mockResolvedValue(page(new Array(100).fill({ id: 'x' }), 269));

      const tool = listTool();
      const result = (await tool.handler(
        tool.zodSchema.parse({ limit: 100, offset: 0 }) as never,
      )) as { paginationNote: string };

      expect(result.paginationNote).toBe(
        'Showing 100 of 269 matches. Fetch the next page with offset 100.',
      );
    });

    it('says so plainly once the last page is in hand', async () => {
      mockGraphql.listDataSilos.mockResolvedValue(page(new Array(69).fill({ id: 'x' }), 269));

      const tool = listTool();
      const result = (await tool.handler(
        tool.zodSchema.parse({ limit: 100, offset: 200 }) as never,
      )) as { paginationNote: string };

      expect(result.paginationNote).toContain('No further pages');
    });

    it('says a zero-match page succeeded, naming the filters applied', async () => {
      mockGraphql.listDataSilos.mockResolvedValue(page([], 0));

      const tool = listTool();
      const result = (await tool.handler(
        tool.zodSchema.parse({ unassignedOnly: true, types: ['api'] }) as never,
      )) as { paginationNote: string };

      expect(result.paginationNote).toContain('unassignedOnly');
      expect(result.paginationNote).toContain('types');
      expect(result.paginationNote).toContain('succeeded');
    });

    it('reports isLive: false as a filter but unassignedOnly: false as none', async () => {
      mockGraphql.listDataSilos.mockResolvedValue(page([], 0));

      const tool = listTool();
      const result = (await tool.handler(
        tool.zodSchema.parse({ isLive: false, unassignedOnly: false }) as never,
      )) as { paginationNote: string };

      expect(result.paginationNote).toContain('isLive');
      expect(result.paginationNote).not.toContain('unassignedOnly');
    });

    it('throws when client throws', async () => {
      mockGraphql.listDataSilos.mockRejectedValue(new Error('GraphQL error'));

      const tool = listTool();
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
        text: undefined,
      });
    });

    it('forwards text filter with dataSiloId', async () => {
      mockGraphql.listDataPoints.mockResolvedValue({
        nodes: [],
        totalCount: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_data_points')!;

      await tool.handler({ dataSiloId: 'silo-1', text: 'customers', limit: 10, offset: 0 });

      expect(mockGraphql.listDataPoints).toHaveBeenCalledWith('silo-1', {
        first: 10,
        offset: 0,
        text: 'customers',
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
        text: undefined,
      });
    });
  });

  describe('inventory_list_catalog_integrations', () => {
    it('returns catalog list from graphql mixin', async () => {
      const nodes = [
        {
          integrationName: 'salesforce',
          title: 'Salesforce',
          description: 'CRM',
          hasApiFunctionality: true,
          hasAvcFunctionality: false,
          alreadyConnected: 1,
          integrationCategory: 'SALES_AND_CRM',
        },
      ];
      mockGraphql.listCatalogs.mockResolvedValue({
        nodes,
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_catalog_integrations')!;

      const result = await tool.handler({ limit: 10, offset: 0 });

      expect(result).toMatchObject({ success: true, data: nodes, count: 1 });
      expect(mockGraphql.listCatalogs).toHaveBeenCalledWith({
        first: 10,
        offset: 0,
        text: undefined,
      });
    });

    it('forwards text filter', async () => {
      mockGraphql.listCatalogs.mockResolvedValue({
        nodes: [],
        totalCount: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_catalog_integrations')!;

      await tool.handler({ text: 'salesforce', limit: 10, offset: 0 });

      expect(mockGraphql.listCatalogs).toHaveBeenCalledWith({
        first: 10,
        offset: 0,
        text: 'salesforce',
      });
    });

    it('forwards pagination first/offset', async () => {
      mockGraphql.listCatalogs.mockResolvedValue({
        nodes: [],
        totalCount: 100,
        pageInfo: { hasNextPage: true, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_catalog_integrations')!;

      await tool.handler({ limit: 25, offset: 50 });

      expect(mockGraphql.listCatalogs).toHaveBeenCalledWith({
        first: 25,
        offset: 50,
        text: undefined,
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
      expect(mockGraphql.listVendors).toHaveBeenCalledWith({
        first: 10,
        offset: 0,
        text: undefined,
      });
    });

    it('forwards text filter', async () => {
      mockGraphql.listVendors.mockResolvedValue({
        nodes: [],
        totalCount: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_vendors')!;

      await tool.handler({ text: 'Acme', limit: 10, offset: 0 });

      expect(mockGraphql.listVendors).toHaveBeenCalledWith({
        first: 10,
        offset: 0,
        text: 'Acme',
      });
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

  describe('inventory_update_or_create_data_point', () => {
    it('creates/updates a datapoint with field purposes', async () => {
      mockGraphql.updateOrCreateDataPoint.mockResolvedValue({ id: 'dp-1', name: 'users' });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_update_or_create_data_point')!;

      const result = await tool.handler({
        dataSiloId: 'silo-1',
        name: 'users',
        subDataPoints: [
          {
            name: 'email',
            purposes: [{ purpose: 'ESSENTIAL', name: 'Other' }],
          },
        ],
      });

      expect(result).toMatchObject({
        success: true,
        data: { dataPoint: { id: 'dp-1', name: 'users' } },
      });
      expect(mockGraphql.updateOrCreateDataPoint).toHaveBeenCalledWith(
        expect.objectContaining({
          dataSiloId: 'silo-1',
          name: 'users',
          subDataPoints: [
            expect.objectContaining({
              name: 'email',
              purposes: [{ purpose: 'ESSENTIAL', name: 'Other' }],
            }),
          ],
        }),
      );
    });

    it('zodSchema rejects invalid purpose enums', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_update_or_create_data_point')!;

      const result = tool.zodSchema.safeParse({
        dataSiloId: 'silo-1',
        name: 'users',
        subDataPoints: [{ name: 'email', purposes: [{ purpose: 'NOT_A_PURPOSE' }] }],
      });
      expect(result.success).toBe(false);
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
        text: undefined,
      });
    });

    it('forwards text filter', async () => {
      mockGraphql.listProcessingPurposes.mockResolvedValue({
        nodes: [],
        totalCount: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_list_processing_purposes')!;

      await tool.handler({ text: 'Essential', limit: 10, offset: 0 });

      expect(mockGraphql.listProcessingPurposes).toHaveBeenCalledWith({
        first: 10,
        offset: 0,
        text: 'Essential',
      });
    });
  });

  describe('inventory_write_category', () => {
    it('upserts by name and category', async () => {
      const category = {
        id: 'cat-1',
        name: 'Email',
        category: 'CONTACT',
        description: 'Email address',
      };
      mockGraphql.writeDataCategory.mockResolvedValue({
        category,
        created: true,
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_write_category')!;

      const result = await tool.handler({ name: 'Email', category: 'CONTACT' });

      expect(result).toMatchObject({
        success: true,
        data: { category, created: true },
      });
      expect(mockGraphql.writeDataCategory).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Email', category: 'CONTACT' }),
      );
    });

    it('updates by id', async () => {
      const category = {
        id: 'cat-1',
        name: 'Email',
        category: 'CONTACT',
        description: 'Updated',
      };
      mockGraphql.writeDataCategory.mockResolvedValue({
        category,
        created: false,
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_write_category')!;

      await tool.handler({ id: 'cat-1', description: 'Updated' });

      expect(mockGraphql.writeDataCategory).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cat-1', description: 'Updated' }),
      );
    });

    it('zodSchema rejects when neither id nor name+category provided', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'inventory_write_category')!;

      const result = tool.zodSchema.safeParse({ description: 'only description' });
      expect(result.success).toBe(false);
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
          {
            id: '1',
            title: 'A',
            type: 'database',
            isLive: true,
            owners: [{ id: 'u1', email: 'dan@example.com', name: 'Dan' }],
            teams: [],
          },
          // Team but no owner: accountable, so not unassigned.
          {
            id: '2',
            title: 'B',
            type: 'database',
            isLive: false,
            outerType: 'sombra',
            owners: [],
            teams: [{ id: 't1', name: 'Privacy' }],
          },
          { id: '3', title: 'C', type: 'api', isLive: true, owners: [], teams: [] },
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
            dataSilosWithoutOwner: number;
            totalVendors: number;
            totalIdentifiers: number;
            totalCategories: number;
          };
          ownership: {
            withoutOwner: number;
            withoutTeam: number;
            withoutOwnerOrTeam: number;
            withoutOwnerByType: Record<string, number>;
          };
          breakdown: {
            dataSilosByType: Record<string, number>;
            dataSilosByOuterType: Record<string, number>;
          };
          topIdentifiers: { name: string; type: string; isRequired?: boolean }[];
          recommendations: string[];
        };
      };

      expect(result.success).toBe(true);
      expect(result.data.summary).toMatchObject({
        totalDataSilos: 3,
        liveDataSilos: 2,
        dataSilosWithoutOwner: 2,
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

    it('quotes the count unassignedOnly would return, not the stricter one', async () => {
      const allPages = <T>(nodes: T[]) => ({
        nodes,
        totalCount: nodes.length,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });
      mockGraphql.listDataSilos.mockResolvedValue(
        allPages([
          {
            id: '1',
            title: 'Owned',
            type: 'database',
            isLive: true,
            owners: [{ id: 'u1', email: 'dan@example.com', name: 'Dan' }],
            teams: [],
          },
          {
            id: '2',
            title: 'Team only',
            type: 'api',
            isLive: true,
            owners: [],
            teams: [{ id: 't1', name: 'Privacy' }],
          },
          { id: '3', title: 'Nobody', type: 'api', isLive: true, owners: [], teams: [] },
          { id: '4', title: 'Nobody either', type: 'api', isLive: true, owners: [], teams: [] },
        ]),
      );
      mockGraphql.listVendors.mockResolvedValue(allPages([{ id: 'v', title: 'V' }]));
      mockGraphql.listIdentifiers.mockResolvedValue(allPages([]));
      mockGraphql.listDataCategories.mockResolvedValue(allPages([]));

      const tool = getTools().find((t) => t.name === 'inventory_analyze')!;
      const result = (await tool.handler({})) as {
        data: {
          ownership: {
            withoutOwner: number;
            withoutTeam: number;
            withoutOwnerOrTeam: number;
            withoutOwnerByType: Record<string, number>;
            listWith: string;
          };
          recommendations: string[];
        };
      };

      expect(result.data.ownership).toMatchObject({
        withoutOwner: 3,
        withoutTeam: 3,
        withoutOwnerOrTeam: 2,
        // Grouped over withoutOwner, so it matches the unassignedOnly population.
        withoutOwnerByType: { api: 3 },
      });
      // The number in the recommendation has to be the one the suggested
      // follow-up call actually returns, or the two disagree by the team-only
      // silo and the agent reports a total it cannot reproduce.
      expect(result.data.recommendations).toContainEqual(
        expect.stringContaining('3 data silos have no owner'),
      );
      expect(result.data.recommendations).toContainEqual(
        expect.stringContaining('2 of them have no team either'),
      );
    });
  });
});
