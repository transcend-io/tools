import type { ToolClients } from '@transcend-io/mcp-server-base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  pull: vi.fn(),
  sync: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  pullTranscendConfiguration: sdk.pull,
  syncConfigurationToTranscend: sdk.sync,
}));

vi.mock('@transcend-io/mcp-server-base/transcend-yml', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@transcend-io/mcp-server-base/transcend-yml')>();
  return {
    ...actual,
    pushYmlSection: vi.fn(async (_clients, section, count, options) => {
      const result = await sdk.sync(section, { marker: 'client' }, options ?? {});
      return { success: result.success, count, errors: result.errors ?? [] };
    }),
    listAllYmlSection: vi.fn(async (_clients, _resource, filter) => {
      const config = (await sdk.pull({ marker: 'client' }, {})) as Record<string, unknown>;
      let items =
        (Array.isArray(config.preflights) && config.preflights) ||
        (Array.isArray(config.actions) && config.actions) ||
        [];
      if (filter) items = items.filter(filter);
      return { data: items, totalCount: items.length, hasNextPage: false };
    }),
  };
});

const { getDSRTools } = await import('../src/tools/index.js');

const clients = {
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

const tool = (name: string) => getDSRTools(clients).find((t) => t.name === name)!;
const run = (name: string, input: unknown) => {
  const t = tool(name);
  return t.handler(t.zodSchema.parse(input) as never) as Promise<Record<string, unknown>>;
};

beforeEach(() => {
  sdk.pull.mockReset();
  sdk.sync.mockReset();
  sdk.sync.mockResolvedValue({ success: true, errors: [] });
});

describe('tool definitions', () => {
  it('lists reads as read-only and writes as idempotent, without requiring Sombra', () => {
    for (const name of ['dsr_list_enrichers', 'dsr_list_actions']) {
      expect(tool(name).readOnly).toBe(true);
      expect(tool(name).requireSombra).toBeFalsy();
    }
    for (const name of ['dsr_write_enrichers', 'dsr_write_actions']) {
      expect(tool(name).readOnly).toBe(false);
      expect(tool(name).annotations.idempotentHint).toBe(true);
      expect(tool(name).requireSombra).toBeFalsy();
    }
  });

  it('rejects empty write arrays', () => {
    expect(tool('dsr_write_enrichers').zodSchema.safeParse({ enrichers: [] }).success).toBe(false);
    expect(tool('dsr_write_actions').zodSchema.safeParse({ actions: [] }).success).toBe(false);
  });
});

describe('dsr_list_enrichers', () => {
  it('returns pull results and applies the title filter', async () => {
    sdk.pull.mockResolvedValue({
      preflights: [
        { title: 'Lookup', 'output-identifiers': ['email'] },
        { title: 'Other', 'output-identifiers': ['phone'] },
      ],
    });
    const result = (await run('dsr_list_enrichers', { title: 'Lookup' })) as {
      data: unknown[];
    };
    expect(sdk.pull).toHaveBeenCalled();
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ title: 'Lookup' });
  });
});

describe('dsr_list_actions', () => {
  it('returns the actions section from pull', async () => {
    sdk.pull.mockResolvedValue({ actions: [{ type: 'ACCESS', requiresReview: true }] });
    const result = (await run('dsr_list_actions', {})) as { data: unknown[] };
    expect(result.data[0]).toMatchObject({ type: 'ACCESS' });
  });
});

describe('dsr_write_enrichers', () => {
  const enricher = {
    title: 'Lookup',
    'input-identifier': 'email',
    'output-identifiers': ['email'],
  };

  it('syncs through syncConfigurationToTranscend', async () => {
    const result = await run('dsr_write_enrichers', { enrichers: [enricher] });
    expect(sdk.sync).toHaveBeenCalledWith(
      { preflights: [enricher] },
      { marker: 'client' },
      expect.objectContaining({ publishToPrivacyCenter: false }),
    );
    expect(result).toMatchObject({ success: true, count: 1, errors: [] });
  });

  it('rejects codec-invalid items before sync', async () => {
    await expect(run('dsr_write_enrichers', { enrichers: [{ title: 'Bad' }] })).rejects.toThrow(
      /preflights\[0\]/,
    );
    expect(sdk.sync).not.toHaveBeenCalled();
  });
});

describe('dsr_write_actions', () => {
  it('passes publishToPrivacyCenter through to sync', async () => {
    const result = await run('dsr_write_actions', {
      actions: [{ type: 'ACCESS', requiresReview: false }],
      publishToPrivacyCenter: true,
    });
    expect(sdk.sync).toHaveBeenCalledWith(
      { actions: [{ type: 'ACCESS', requiresReview: false }] },
      { marker: 'client' },
      expect.objectContaining({ publishToPrivacyCenter: true }),
    );
    expect(result).toMatchObject({ success: true, count: 1 });
  });

  it('reports invalid items before sync', async () => {
    await expect(run('dsr_write_actions', { actions: [{ type: 'NOT_A_TYPE' }] })).rejects.toThrow(
      /actions\[0\]/,
    );
    expect(sdk.sync).not.toHaveBeenCalled();
  });
});
