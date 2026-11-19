import { ErrorCode } from '@transcend-io/mcp-server-base';
import { fetchAllConsentSites, syncConsentSites } from '@transcend-io/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getConsentTools } from '../src/tools/index.js';

const GRAPHQL_CLIENT = { sentinel: 'graphql-request-client' };

vi.mock('@transcend-io/mcp-server-base', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/mcp-server-base')>()),
  createGraphqlRequestClient: vi.fn(() => GRAPHQL_CLIENT),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  fetchAllConsentSites: vi.fn(),
  syncConsentSites: vi.fn(),
}));

const makeHost = (host: string, overrides: Record<string, unknown> = {}) => ({
  id: `id-${host}`,
  host,
  site: 'example.com',
  description: null,
  includeInMetadata: true,
  deletedAt: null,
  owners: [],
  teams: [],
  attributeValues: [],
  ...overrides,
});

describe('consent sites tools', () => {
  const getTool = (name: string) =>
    getConsentTools({
      rest: {} as never,
      graphql: {} as never,
      dashboardUrl: 'https://app.transcend.io',
    }).find((tool) => tool.name === name)!;

  beforeEach(() => {
    vi.mocked(fetchAllConsentSites).mockReset();
    vi.mocked(syncConsentSites).mockReset();
  });

  describe('registration and annotations', () => {
    it('registers both tools in the consent category', () => {
      expect(getTool('consent_list_sites').category).toBe('Consent Management');
      expect(getTool('consent_write_sites').category).toBe('Consent Management');
    });

    it('marks the list tool read-only and idempotent', () => {
      const tool = getTool('consent_list_sites');
      expect(tool.readOnly).toBe(true);
      expect(tool.annotations).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      });
      expect(tool.confirmation).toBeUndefined();
    });

    it('marks the write tool as a non-destructive idempotent upsert without a confirmation gate', () => {
      const tool = getTool('consent_write_sites');
      expect(tool.readOnly).toBe(false);
      expect(tool.annotations).toEqual({
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      });
      expect(tool.confirmation).toBeUndefined();
    });

    it('keeps descriptions in the caller vocabulary and under the budget', () => {
      for (const name of ['consent_list_sites', 'consent_write_sites']) {
        const { description } = getTool(name);
        expect(description.length).toBeLessThanOrEqual(700);
        expect(description).toMatch(/domains/);
        expect(description).toMatch(/hosts/);
      }
    });
  });

  describe('consent_list_sites', () => {
    it('applies the shared pagination defaults and rejects an out-of-range limit', () => {
      const tool = getTool('consent_list_sites');
      expect(tool.zodSchema.parse({})).toMatchObject({ offset: 0 });
      expect(tool.zodSchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(tool.zodSchema.safeParse({ limit: 101 }).success).toBe(false);
      expect(tool.zodSchema.safeParse({ offset: -1 }).success).toBe(false);
    });

    it('returns compact rows in the consent-sites yml shape', async () => {
      vi.mocked(fetchAllConsentSites).mockResolvedValue([
        makeHost('app.example.com', {
          description: 'Main app',
          owners: [{ email: 'a@example.com' }],
          teams: [{ name: 'Privacy' }],
          attributeValues: [
            { attributeKey: { name: 'Env' }, name: 'prod' },
            { attributeKey: { name: 'Env' }, name: 'internal' },
          ],
        }),
        makeHost('docs.example.com'),
      ] as never);

      const tool = getTool('consent_list_sites');
      const result = (await tool.handler(tool.zodSchema.parse({ limit: 10 }))) as {
        success: boolean;
        data: unknown[];
        count: number;
        totalCount: number;
        hasNextPage: boolean;
      };

      expect(fetchAllConsentSites).toHaveBeenCalledWith(GRAPHQL_CLIENT);
      expect(result).toMatchObject({
        success: true,
        count: 2,
        totalCount: 2,
        hasNextPage: false,
      });
      expect(result.data).toEqual([
        {
          host: 'app.example.com',
          site: 'example.com',
          description: 'Main app',
          owners: ['a@example.com'],
          teams: ['Privacy'],
          attributes: [{ key: 'Env', values: ['prod', 'internal'] }],
        },
        {
          host: 'docs.example.com',
          site: 'example.com',
          description: undefined,
          owners: [],
          teams: [],
          attributes: [],
        },
      ]);
    });

    it('pages with limit and offset and reports whether more rows remain', async () => {
      vi.mocked(fetchAllConsentSites).mockResolvedValue(
        ['a', 'b', 'c'].map((name) => makeHost(`${name}.example.com`)) as never,
      );
      const tool = getTool('consent_list_sites');

      const first = (await tool.handler(tool.zodSchema.parse({ limit: 2, offset: 0 }))) as {
        data: { host: string }[];
        hasNextPage: boolean;
        totalCount: number;
      };
      expect(first.data.map(({ host }) => host)).toEqual(['a.example.com', 'b.example.com']);
      expect(first).toMatchObject({ hasNextPage: true, totalCount: 3 });

      const second = (await tool.handler(tool.zodSchema.parse({ limit: 2, offset: 2 }))) as {
        data: { host: string }[];
        hasNextPage: boolean;
      };
      expect(second.data.map(({ host }) => host)).toEqual(['c.example.com']);
      expect(second.hasNextPage).toBe(false);
    });

    it('returns an empty list rather than an error when there are no sites', async () => {
      vi.mocked(fetchAllConsentSites).mockResolvedValue([]);
      const tool = getTool('consent_list_sites');
      const result = await tool.handler(tool.zodSchema.parse({}));
      expect(result).toMatchObject({ success: true, data: [], count: 0, totalCount: 0 });
    });
  });

  describe('consent_write_sites', () => {
    it('rejects missing, empty, oversized, and duplicate-host input', () => {
      const tool = getTool('consent_write_sites');
      expect(tool.zodSchema.safeParse({}).success).toBe(false);
      expect(tool.zodSchema.safeParse({ sites: [] }).success).toBe(false);
      expect(tool.zodSchema.safeParse({ sites: [{ host: '' }] }).success).toBe(false);
      expect(tool.zodSchema.safeParse({ sites: [{ description: 'no host' }] }).success).toBe(false);
      expect(
        tool.zodSchema.safeParse({
          sites: Array.from({ length: 101 }, (_, i) => ({ host: `h${i}.example.com` })),
        }).success,
      ).toBe(false);
      const duplicate = tool.zodSchema.safeParse({
        sites: [{ host: 'a.example.com' }, { host: 'a.example.com' }],
      });
      expect(duplicate.success).toBe(false);
    });

    it('rejects attributes without a key or values', () => {
      const tool = getTool('consent_write_sites');
      expect(
        tool.zodSchema.safeParse({
          sites: [{ host: 'a.example.com', attributes: [{ key: 'Env' }] }],
        }).success,
      ).toBe(false);
    });

    it('calls syncConsentSites with the sites and reports the hosts written', async () => {
      vi.mocked(syncConsentSites).mockResolvedValue(true);
      const sites = [
        {
          host: 'app.example.com',
          site: 'example.com',
          description: 'Main app',
          owners: ['a@example.com'],
          teams: ['Privacy'],
          attributes: [{ key: 'Env', values: ['prod'] }],
        },
        { host: 'docs.example.com' },
      ];

      const tool = getTool('consent_write_sites');
      const result = await tool.handler(tool.zodSchema.parse({ sites }));

      expect(syncConsentSites).toHaveBeenCalledTimes(1);
      expect(syncConsentSites).toHaveBeenCalledWith(
        GRAPHQL_CLIENT,
        sites,
        expect.objectContaining({ logger: expect.any(Object) }),
      );
      expect(result).toMatchObject({
        success: true,
        data: { written: 2, hosts: ['app.example.com', 'docs.example.com'] },
      });
    });

    it('returns a non-retryable API error carrying the sync failure message', async () => {
      vi.mocked(syncConsentSites).mockImplementation(async (_client, _sites, options) => {
        options?.logger?.error('Failed to sync consent sites! - Unknown team "Nope"');
        return false;
      });

      const tool = getTool('consent_write_sites');
      const result = await tool.handler(
        tool.zodSchema.parse({ sites: [{ host: 'app.example.com', teams: ['Nope'] }] }),
      );

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Unknown team "Nope"'),
        code: ErrorCode.API_ERROR,
        retryable: false,
        details: { hosts: ['app.example.com'] },
      });
    });
  });
});
