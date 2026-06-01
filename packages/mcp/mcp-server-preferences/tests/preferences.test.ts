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
      const preferences = [{ userId: 'u1', purposes: [{ purpose: 'analytics', enabled: true }] }];
      mockRest.queryPreferences.mockResolvedValue(preferences);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'preferences_query')!;

      const result = await tool.handler({
        partition: 'my-org',
        identifiers: [{ value: 'user@example.com', type: 'email' }],
      });

      expect(result).toMatchObject({ success: true, data: preferences });
      expect(mockRest.queryPreferences).toHaveBeenCalledWith({
        partition: 'my-org',
        identifiers: [{ value: 'user@example.com', type: 'email' }],
      });
    });

    it('throws when client throws', async () => {
      mockRest.queryPreferences.mockRejectedValue(new Error('REST error'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'preferences_query')!;

      await expect(
        tool.handler({
          partition: 'my-org',
          identifiers: [{ value: 'user@example.com' }],
        }),
      ).rejects.toThrow('REST error');
    });
  });
});
