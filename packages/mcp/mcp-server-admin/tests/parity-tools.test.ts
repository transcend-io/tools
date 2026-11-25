import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  sync: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  syncConfigurationToTranscend: sdk.sync,
}));

vi.mock('@transcend-io/mcp-server-base', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/mcp-server-base')>()),
  createGraphqlRequestClient: () => ({ marker: 'client' }),
}));

vi.mock('@transcend-io/mcp-server-base/transcend-yml', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@transcend-io/mcp-server-base/transcend-yml')>();
  return {
    ...actual,
    pushYmlSection: vi.fn(async (_clients, section, count, options = {}) => {
      const result = await sdk.sync(
        section,
        { marker: 'client' },
        { publishToPrivacyCenter: options.publishToPrivacyCenter ?? false },
      );
      return { success: result.success, count, errors: result.errors ?? [] };
    }),
  };
});

const { getAdminTools } = await import('../src/index.js');

const tools = getAdminTools({
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
});
const tool = (name: string) => tools.find((t) => t.name === name)!;

beforeEach(() => {
  sdk.sync.mockReset();
  sdk.sync.mockResolvedValue({ success: true, errors: [] });
});

describe('annotations', () => {
  it('gates only the teams write', () => {
    expect(tool('admin_write_teams').confirmation?.hint).toBeTruthy();
  });

  it('marks admin_write_teams as a write with idempotent hint', () => {
    expect(tool('admin_write_teams').readOnly).toBe(false);
    expect(tool('admin_write_teams').annotations.idempotentHint).toBe(true);
  });
});

describe('admin_write_teams', () => {
  it('syncs decoded teams and reports success', async () => {
    const teams = [{ name: 'Legal', description: 'Legal team', users: ['a@b.com'] }];
    const result = await tool('admin_write_teams').handler({ teams });
    expect(result).toEqual({ success: true, count: 1, errors: [] });
    expect(sdk.sync).toHaveBeenCalledWith({ teams }, { marker: 'client' }, expect.any(Object));
  });

  it('rejects items that do not match the yml codec', async () => {
    await expect(
      tool('admin_write_teams').handler({ teams: [{ name: 'No description' }] }),
    ).rejects.toThrow(/teams\[0\] does not match/);
    expect(sdk.sync).not.toHaveBeenCalled();
  });

  it('returns collected errors when the sync fails', async () => {
    sdk.sync.mockResolvedValue({
      success: false,
      errors: [
        { resource: 'teams', item: 'Legal', message: 'Failed to sync team "Legal"! - boom' },
      ],
      warnings: ['careful'],
    });
    const result = await tool('admin_write_teams').handler({
      teams: [{ name: 'Legal', description: 'd' }],
    });
    expect(result).toEqual({
      success: false,
      count: 1,
      errors: [
        { resource: 'teams', item: 'Legal', message: 'Failed to sync team "Legal"! - boom' },
      ],
    });
  });
});
