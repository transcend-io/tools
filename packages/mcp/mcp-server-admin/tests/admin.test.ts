import { TRANSCEND_SCOPES } from '@transcend-io/privacy-types';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getAdminTools } from '../src/tools.js';

const EXPECTED_TOOL_NAMES = [
  'admin_get_organization',
  'admin_get_current_user',
  'admin_list_users',
  'admin_list_teams',
  'admin_list_api_keys',
  'admin_list_scopes',
  'admin_get_privacy_center',
  'admin_test_connection',
] as const;

describe('Admin Tools', () => {
  let mockGraphql: {
    getOrganization: ReturnType<typeof vi.fn>;
    getCurrentUser: ReturnType<typeof vi.fn>;
    listUsers: ReturnType<typeof vi.fn>;
    listTeams: ReturnType<typeof vi.fn>;
    listApiKeys: ReturnType<typeof vi.fn>;
    getPrivacyCenter: ReturnType<typeof vi.fn>;
    testConnection: ReturnType<typeof vi.fn>;
    getBaseUrl: ReturnType<typeof vi.fn>;
  };

  let mockRest: {
    testConnection: ReturnType<typeof vi.fn>;
    getBaseUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphql = {
      getOrganization: vi.fn(),
      getCurrentUser: vi.fn(),
      listUsers: vi.fn(),
      listTeams: vi.fn(),
      listApiKeys: vi.fn(),
      getPrivacyCenter: vi.fn(),
      testConnection: vi.fn(),
      getBaseUrl: vi.fn().mockReturnValue('https://api.transcend.io'),
    };
    mockRest = {
      testConnection: vi.fn(),
      getBaseUrl: vi.fn().mockReturnValue('https://multi-tenant.sombra.transcend.io'),
    };
  });

  const getTools = () =>
    getAdminTools({
      rest: mockRest as never,
      graphql: mockGraphql as never,
      dashboardUrl: 'https://app.transcend.io',
    });

  it('registers exactly 8 tools with expected names', () => {
    const tools = getTools();
    expect(tools).toHaveLength(8);
    expect(tools.map((t) => t.name)).toEqual([...EXPECTED_TOOL_NAMES]);
  });

  describe('admin_list_scopes', () => {
    it('returns compact rows for every TRANSCEND_SCOPES key by default', async () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'admin_list_scopes')!;

      const result = (await tool.handler({})) as {
        success: boolean;
        data: Array<{
          name: string;
          title: string;
          type: string;
          dependencies: string[];
          description?: string;
          products?: string[];
        }>;
        totalCount: number;
      };

      const catalogNames = Object.keys(TRANSCEND_SCOPES);
      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(catalogNames.length);
      expect(result.data.map((row) => row.name)).toEqual(catalogNames);
      expect(result.data[0]).toEqual({
        name: result.data[0].name,
        title: expect.any(String),
        type: expect.any(String),
        dependencies: expect.any(Array),
      });
      expect(result.data[0]).not.toHaveProperty('description');
      expect(result.data[0]).not.toHaveProperty('products');
      expect(mockGraphql.listApiKeys).not.toHaveBeenCalled();
    });

    it('adds description and products when includeDetails is true', async () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'admin_list_scopes')!;

      const result = (await tool.handler({ includeDetails: true })) as {
        data: Array<{ description?: string; products?: string[] }>;
      };

      expect(result.data[0]).toEqual(
        expect.objectContaining({
          description: expect.any(String),
          products: expect.any(Array),
        }),
      );
    });

    it('filters by text over name, title, and description', async () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'admin_list_scopes')!;

      const result = (await tool.handler({ text: 'consent' })) as {
        data: Array<{ name: string }>;
        totalCount: number;
      };

      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.totalCount).toBeLessThan(Object.keys(TRANSCEND_SCOPES).length);
      expect(result.data.some((row) => row.name.toLowerCase().includes('consent'))).toBe(true);
    });
  });

  describe('admin_list_users', () => {
    it('returns list on success', async () => {
      const nodes = [
        {
          id: 'u1',
          email: 'a@b.com',
          name: 'Alice',
          isAdmin: false,
          isInvited: false,
          isLocked: false,
          teams: [],
          scopes: [],
        },
      ];
      mockGraphql.listUsers.mockResolvedValue({
        nodes,
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'admin_list_users')!;

      const result = await tool.handler({});

      expect(result).toMatchObject({ success: true, data: nodes, totalCount: 1 });
      expect(mockGraphql.listUsers).toHaveBeenCalledWith({
        first: 50,
        offset: 0,
        filterBy: {},
        orderBy: [{ field: 'name', direction: 'ASC' }],
      });
    });

    it('maps text and isAdmin into sparse filterBy', async () => {
      mockGraphql.listUsers.mockResolvedValue({
        nodes: [],
        totalCount: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'admin_list_users')!;

      await tool.handler({ text: 'ada@', isAdmin: true, limit: 10, offset: 5 });

      expect(mockGraphql.listUsers).toHaveBeenCalledWith({
        first: 10,
        offset: 5,
        filterBy: { text: 'ada@', isAdmin: true },
        orderBy: [{ field: 'name', direction: 'ASC' }],
      });
    });

    it('throws when client throws', async () => {
      mockGraphql.listUsers.mockRejectedValue(new Error('Network error'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'admin_list_users')!;

      await expect(tool.handler({})).rejects.toThrow('Network error');
    });
  });
});
