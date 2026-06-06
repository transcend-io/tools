import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AdminMixin } from '../src/graphql.js';
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

describe('AdminMixin.createApiKey', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockFetchOnce = (payload: unknown) =>
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'OK',
      json: async () => ({ data: payload }),
    });

  it('sends a mutation that selects nested scopes { id name } and apiKey.apiKey, with no top-level token field', async () => {
    const mockFetch = mockFetchOnce({
      createApiKey: {
        apiKey: {
          id: 'key-1',
          title: 'Test Key',
          apiKey: 'tok_xxx',
          scopes: [{ id: 'scope-1', name: 'viewDataMap' }],
          createdAt: '2024-01-01',
        },
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AdminMixin({ type: 'apiKey', apiKey: 'test-api-key' });
    await client.createApiKey({ title: 'Test Key', scopes: ['viewDataMap'] });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body as string) as { query: string };
    const normalized = body.query.replace(/\s+/g, ' ').trim();

    expect(normalized).toContain('mutation CreateApiKey($input: ApiKeyInput!)');
    expect(normalized).toContain('apiKey { id title apiKey scopes { id name } createdAt }');
    // Guard against regression: there must not be a bare `token` selection on
    // the payload, and `scopes` must never appear without subfield selection.
    expect(normalized).not.toMatch(/\}\s*token\s*\}/);
    expect(normalized).not.toMatch(/scopes\s+createdAt/);
  });

  it('returns { apiKey, token } with token sourced from the nested apiKey.apiKey field', async () => {
    const mockFetch = mockFetchOnce({
      createApiKey: {
        apiKey: {
          id: 'key-1',
          title: 'Test Key',
          apiKey: 'tok_xxx',
          scopes: [{ id: 'scope-1', name: 'viewDataMap' }],
          createdAt: '2024-01-01',
        },
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AdminMixin({ type: 'apiKey', apiKey: 'test-api-key' });
    const result = await client.createApiKey({
      title: 'Test Key',
      scopes: ['viewDataMap'],
    });

    expect(result).toEqual({
      apiKey: {
        id: 'key-1',
        title: 'Test Key',
        scopes: [{ id: 'scope-1', name: 'viewDataMap' }],
        createdAt: '2024-01-01',
      },
      token: 'tok_xxx',
    });
    // The plain-text token must not leak back onto the returned ApiKey object.
    expect(result.apiKey).not.toHaveProperty('apiKey');
  });
});
