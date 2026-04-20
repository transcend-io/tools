import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getAdminTools } from '../src/tools.js';

const EXPECTED_TOOL_NAMES = [
  'admin_get_organization',
  'admin_get_current_user',
  'admin_list_users',
  'admin_list_teams',
  'admin_list_api_keys',
  'admin_create_api_key',
  'admin_get_privacy_center',
  'admin_test_connection',
  'graphql_introspect',
] as const;

describe('Admin Tools', () => {
  let mockGraphql: {
    getOrganization: ReturnType<typeof vi.fn>;
    getCurrentUser: ReturnType<typeof vi.fn>;
    listUsers: ReturnType<typeof vi.fn>;
    listTeams: ReturnType<typeof vi.fn>;
    listApiKeys: ReturnType<typeof vi.fn>;
    createApiKey: ReturnType<typeof vi.fn>;
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
      createApiKey: vi.fn(),
      getPrivacyCenter: vi.fn(),
      testConnection: vi.fn(),
      getBaseUrl: vi.fn().mockReturnValue('https://api.transcend.io'),
      validateQuery: vi.fn(),
    };
    mockRest = {
      testConnection: vi.fn(),
      getBaseUrl: vi.fn().mockReturnValue('https://multi-tenant.sombra.transcend.io'),
    };
  });

  const getTools = () =>
    getAdminTools({
      rest: mockRest as never,
      graphql: mockGraphql,
    });

  it(`registers exactly ${EXPECTED_TOOL_NAMES.length} tools with expected names`, () => {
    const tools = getTools();
    expect(tools).toHaveLength(EXPECTED_TOOL_NAMES.length);
    expect(tools.map((t) => t.name)).toEqual([...EXPECTED_TOOL_NAMES]);
  });

  describe('admin_create_api_key', () => {
    it('zodSchema rejects when title and scopes are missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'admin_create_api_key')!;

      const result = tool.zodSchema.safeParse({});
      expect(result.success).toBe(false);
      expect((result as any).error.issues.map((i: any) => i.path[0])).toEqual(
        expect.arrayContaining(['title', 'scopes']),
      );
      expect(mockGraphql.createApiKey).not.toHaveBeenCalled();
    });

    it('creates API key on success', async () => {
      const response = {
        apiKey: { id: 'key-1', title: 'Test Key', scopes: ['readWrite'], createdAt: '2024-01-01' },
        token: 'secret-token',
      };
      mockGraphql.createApiKey.mockResolvedValue(response);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'admin_create_api_key')!;

      const result = await tool.handler({ title: 'Test Key', scopes: ['readWrite'] });

      expect(result).toMatchObject({ success: true });
      expect(mockGraphql.createApiKey).toHaveBeenCalledWith({
        title: 'Test Key',
        scopes: ['readWrite'],
        dataSilos: undefined,
      });
    });
  });

  describe('admin_list_users', () => {
    it('returns list on success', async () => {
      const nodes = [{ id: 'u1', email: 'a@b.com', name: 'Alice' }];
      mockGraphql.listUsers.mockResolvedValue({
        nodes,
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'admin_list_users')!;

      const result = await tool.handler({});

      expect(result).toMatchObject({ success: true, data: nodes, totalCount: 1 });
    });

    it('throws when client throws', async () => {
      mockGraphql.listUsers.mockRejectedValue(new Error('Network error'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'admin_list_users')!;

      await expect(tool.handler({})).rejects.toThrow('Network error');
    });
  });
});
