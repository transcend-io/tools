import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getPreferenceTools } from '../src/tools.js';

const EXPECTED_TOOL_NAMES = [
  'preferences_query',
  'preferences_upsert',
  'preferences_delete',
  'preferences_append_identifiers',
  'preferences_update_identifiers',
  'preferences_delete_identifiers',
] as const;

describe('Preferences Tools', () => {
  let mockRest: {
    queryPreferences: ReturnType<typeof vi.fn>;
    upsertPreferences: ReturnType<typeof vi.fn>;
    deletePreferences: ReturnType<typeof vi.fn>;
    appendIdentifiers: ReturnType<typeof vi.fn>;
    updateIdentifiers: ReturnType<typeof vi.fn>;
    deleteIdentifiers: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRest = {
      queryPreferences: vi.fn(),
      upsertPreferences: vi.fn(),
      deletePreferences: vi.fn(),
      appendIdentifiers: vi.fn(),
      updateIdentifiers: vi.fn(),
      deleteIdentifiers: vi.fn(),
    };
  });

  const getTools = () =>
    getPreferenceTools({
      rest: mockRest as never,
      graphql: {} as never,
      dashboardUrl: 'https://app.transcend.io',
    });

  it('registers exactly 6 tools with expected names', () => {
    const tools = getTools();
    expect(tools).toHaveLength(6);
    expect(tools.map((t) => t.name)).toEqual([...EXPECTED_TOOL_NAMES]);
  });

  describe('preferences_query', () => {
    it('zodSchema rejects input when required fields are missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'preferences_query')!;

      const result = tool.zodSchema.safeParse({});

      expect(result.success).toBe(false);
      expect((result as any).error.issues.map((i: any) => i.path[0])).toEqual(
        expect.arrayContaining(['partition', 'identifiers']),
      );
    });

    it('returns preferences on success', async () => {
      const nodes = [{ userId: 'u1', purposes: [{ purpose: 'analytics', enabled: true }] }];
      mockRest.queryPreferences.mockResolvedValue({ nodes, cursor: 'next-page' });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'preferences_query')!;

      const result = await tool.handler({
        partition: 'my-org',
        identifiers: [{ name: 'email', value: 'user@example.com' }],
        limit: 10,
      });

      expect(result).toMatchObject({
        success: true,
        data: nodes,
        hasNextPage: true,
        nextCursor: 'next-page',
      });
      expect(mockRest.queryPreferences).toHaveBeenCalledWith({
        partition: 'my-org',
        identifiers: [{ name: 'email', value: 'user@example.com' }],
        limit: 10,
        cursor: undefined,
      });
    });

    it('throws when client throws', async () => {
      mockRest.queryPreferences.mockRejectedValue(new Error('REST error'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'preferences_query')!;

      await expect(
        tool.handler({
          partition: 'my-org',
          identifiers: [{ name: 'email', value: 'user@example.com' }],
        }),
      ).rejects.toThrow('REST error');
    });
  });

  describe('preferences_append_identifiers', () => {
    it('calls appendIdentifiers with records payload', async () => {
      mockRest.appendIdentifiers.mockResolvedValue({ records: [{ success: true }], failures: [] });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'preferences_append_identifiers')!;
      const records = [
        {
          anchorIdentifier: { name: 'email', value: 'user@example.com' },
          append: { name: 'phone', value: '+15551234567' },
          timestamp: '2024-01-15T10:30:00Z',
        },
      ];

      const result = await tool.handler({ partition: 'default', records });

      expect(result).toMatchObject({ success: true });
      expect(mockRest.appendIdentifiers).toHaveBeenCalledWith('default', records);
    });
  });
});
