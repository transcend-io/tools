import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getDSRTools } from '../src/tools.js';

const EXPECTED_TOOL_NAMES = [
  'dsr_submit',
  'dsr_poll_status',
  'dsr_list',
  'dsr_get_details',
  'dsr_download_keys',
  'dsr_list_identifiers',
  'dsr_list_request_data_silos',
  'dsr_enrich_identifiers',
  'dsr_respond_access',
  'dsr_respond_erasure',
  'dsr_cancel',
  'dsr_submit_on_behalf',
  'dsr_analyze',
] as const;

describe('DSR Tools', () => {
  let mockGraphql: {
    listRequests: ReturnType<typeof vi.fn>;
    getRequest: ReturnType<typeof vi.fn>;
    listRequestDataSilos: ReturnType<typeof vi.fn>;
    employeeMakeDataSubjectRequest: ReturnType<typeof vi.fn>;
    cancelRequest: ReturnType<typeof vi.fn>;
  };

  let mockRest: {
    submitDSR: ReturnType<typeof vi.fn>;
    pollDSRStatus: ReturnType<typeof vi.fn>;
    downloadKeys: ReturnType<typeof vi.fn>;
    listDSRIdentifiers: ReturnType<typeof vi.fn>;
    enrichIdentifiers: ReturnType<typeof vi.fn>;
    respondAccess: ReturnType<typeof vi.fn>;
    respondErasure: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphql = {
      listRequests: vi.fn(),
      getRequest: vi.fn(),
      listRequestDataSilos: vi.fn(),
      employeeMakeDataSubjectRequest: vi.fn(),
      cancelRequest: vi.fn(),
    };
    mockRest = {
      submitDSR: vi.fn(),
      pollDSRStatus: vi.fn(),
      downloadKeys: vi.fn(),
      listDSRIdentifiers: vi.fn(),
      enrichIdentifiers: vi.fn(),
      respondAccess: vi.fn(),
      respondErasure: vi.fn(),
    };
  });

  const getTools = () =>
    getDSRTools({
      rest: mockRest as never,
      graphql: mockGraphql as never,
      dashboardUrl: 'https://app.transcend.io',
    });

  it('registers exactly 13 tools with expected names', () => {
    const tools = getTools();
    expect(tools).toHaveLength(13);
    expect(tools.map((t) => t.name)).toEqual([...EXPECTED_TOOL_NAMES]);
  });

  describe('dsr_get_details', () => {
    it('zodSchema rejects when requestId is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'dsr_get_details')!;

      const result = tool.zodSchema.safeParse({});
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['requestId']);
    });

    it('returns request details on success', async () => {
      const details = {
        id: 'req-1',
        type: 'ERASURE',
        status: 'COMPILING',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        owners: [{ id: 'u1', email: 'approver@example.com', name: 'Approver' }],
        teams: [{ id: 't1', name: 'Privacy' }],
      };
      mockGraphql.getRequest.mockResolvedValue(details);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'dsr_get_details')!;

      const result = await tool.handler({ requestId: 'req-1' });

      expect(result).toMatchObject({ success: true, data: details });
      expect(mockGraphql.getRequest).toHaveBeenCalledWith('req-1');
    });
  });

  describe('dsr_list_request_data_silos', () => {
    it('zodSchema rejects when requestId is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'dsr_list_request_data_silos')!;

      const result = tool.zodSchema.safeParse({});
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['requestId']);
    });

    it('returns request data silos with owners on success', async () => {
      const nodes = [
        {
          id: 'rds-1',
          status: 'ERROR',
          error: 'Timeout contacting Salesforce',
          dataSilo: {
            id: 'silo-1',
            title: 'Salesforce',
            type: 'salesforce',
            owners: [{ id: 'u2', email: 'owner@example.com', name: 'Silo Owner' }],
            teams: [{ id: 't2', name: 'CRM' }],
          },
        },
      ];
      mockGraphql.listRequestDataSilos.mockResolvedValue({
        nodes,
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'dsr_list_request_data_silos')!;

      const result = await tool.handler({
        requestId: 'req-1',
        status: ['ERROR'],
        first: 10,
        offset: 0,
      });

      expect(result).toMatchObject({ success: true, data: nodes, totalCount: 1 });
      expect(mockGraphql.listRequestDataSilos).toHaveBeenCalledWith({
        requestId: 'req-1',
        status: ['ERROR'],
        visualStatus: undefined,
        text: undefined,
        first: 10,
        offset: 0,
      });
    });
  });

  describe('dsr_list', () => {
    it('returns list on success', async () => {
      const nodes = [{ id: 'r1', type: 'ACCESS', status: 'COMPILING' }];
      mockGraphql.listRequests.mockResolvedValue({
        nodes,
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'dsr_list')!;

      const result = await tool.handler({});

      expect(result).toMatchObject({ success: true, data: nodes, totalCount: 1 });
    });

    it('throws when client throws', async () => {
      mockGraphql.listRequests.mockRejectedValue(new Error('GraphQL error'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'dsr_list')!;

      await expect(tool.handler({})).rejects.toThrow('GraphQL error');
    });
  });
});
