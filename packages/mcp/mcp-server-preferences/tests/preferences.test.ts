import { FETCH_CONSENT_MANAGER, CONSENT_PARTITIONS } from '@transcend-io/sdk';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getPreferenceTools } from '../src/tools.js';

const EXPECTED_TOOL_NAMES = [
  'preferences_list_partitions',
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
  let mockGraphql: {
    makeRequest: ReturnType<typeof vi.fn>;
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
    mockGraphql = {
      makeRequest: vi.fn(),
    };
  });

  const getTools = () =>
    getPreferenceTools({
      rest: mockRest as never,
      graphql: mockGraphql as never,
      dashboardUrl: 'https://app.transcend.io',
    });

  it('registers exactly 7 tools with expected names', () => {
    const tools = getTools();
    expect(tools).toHaveLength(7);
    expect(tools.map((t) => t.name)).toEqual([...EXPECTED_TOOL_NAMES]);
  });

  describe('preferences_list_partitions', () => {
    it('returns default + custom partitions with effective flag using path key', async () => {
      const bundleId = 'bundle-uuid-1111';
      const customPath = 'custom-slug-abc';
      const customDbId = 'airgap-partition-db-id';

      mockGraphql.makeRequest.mockImplementation(async (query: unknown) => {
        if (query === FETCH_CONSENT_MANAGER) {
          return {
            consentManager: {
              consentManager: {
                id: bundleId,
                partition: { partition: customPath },
              },
            },
          };
        }
        if (query === CONSENT_PARTITIONS) {
          return {
            consentPartitions: {
              nodes: [{ id: customDbId, name: 'EU Store', partition: customPath }],
            },
          };
        }
        throw new Error(`Unexpected query: ${String(query)}`);
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'preferences_list_partitions')!;
      const result = (await tool.handler({})) as {
        success: boolean;
        data: {
          effectivePartition: string;
          partitions: Array<{
            partition: string;
            name: string;
            type: string;
            isEffectiveForConsentManager: boolean;
            airgapPartitionId?: string;
          }>;
        };
      };

      expect(result.success).toBe(true);
      expect(result.data.effectivePartition).toBe(customPath);
      expect(result.data.partitions).toEqual([
        {
          partition: bundleId,
          name: 'Default (airgap bundle)',
          type: 'default',
          isEffectiveForConsentManager: false,
        },
        {
          partition: customPath,
          name: 'EU Store',
          type: 'custom',
          isEffectiveForConsentManager: true,
          airgapPartitionId: customDbId,
        },
      ]);
      expect(result.data.partitions[1].partition).not.toBe(customDbId);
      expect(mockGraphql.makeRequest).toHaveBeenCalledWith(FETCH_CONSENT_MANAGER, {});
      expect(mockGraphql.makeRequest).toHaveBeenCalledWith(CONSENT_PARTITIONS, {
        first: 50,
        offset: 0,
      });
    });

    it('marks default as effective when no custom partition is linked', async () => {
      const bundleId = 'bundle-uuid-2222';

      mockGraphql.makeRequest.mockImplementation(async (query: unknown) => {
        if (query === FETCH_CONSENT_MANAGER) {
          return {
            consentManager: {
              consentManager: {
                id: bundleId,
              },
            },
          };
        }
        if (query === CONSENT_PARTITIONS) {
          return { consentPartitions: { nodes: [] } };
        }
        throw new Error(`Unexpected query: ${String(query)}`);
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'preferences_list_partitions')!;
      const result = (await tool.handler({})) as {
        data: {
          effectivePartition: string;
          partitions: Array<{ type: string; isEffectiveForConsentManager: boolean }>;
        };
      };

      expect(result.data.effectivePartition).toBe(bundleId);
      expect(result.data.partitions).toHaveLength(1);
      expect(result.data.partitions[0]).toMatchObject({
        type: 'default',
        isEffectiveForConsentManager: true,
      });
    });

    it('deduplicates custom rows whose path equals the bundle id', async () => {
      const bundleId = 'bundle-uuid-3333';

      mockGraphql.makeRequest.mockImplementation(async (query: unknown) => {
        if (query === FETCH_CONSENT_MANAGER) {
          return {
            consentManager: {
              consentManager: { id: bundleId },
            },
          };
        }
        if (query === CONSENT_PARTITIONS) {
          return {
            consentPartitions: {
              nodes: [{ id: 'dup-id', name: 'Dup', partition: bundleId }],
            },
          };
        }
        throw new Error(`Unexpected query: ${String(query)}`);
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'preferences_list_partitions')!;
      const result = (await tool.handler({})) as {
        data: { partitions: unknown[] };
      };

      expect(result.data.partitions).toHaveLength(1);
    });
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
