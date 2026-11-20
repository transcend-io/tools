import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  syncTeams: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  ...sdk,
}));

vi.mock('@transcend-io/mcp-server-base', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/mcp-server-base')>()),
  createGraphqlRequestClient: () => ({ marker: 'client' }),
}));

const { getAdminTools } = await import('../src/index.js');

const tools = getAdminTools({
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
});
const tool = (name: string) => tools.find((t) => t.name === name)!;

beforeEach(() => {
  for (const fn of Object.values(sdk)) fn.mockReset();
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
    sdk.syncTeams.mockResolvedValue(true);
    const teams = [{ name: 'Legal', description: 'Legal team', users: ['a@b.com'] }];
    const result = await tool('admin_write_teams').handler({ teams });
    expect(result).toEqual({ success: true, count: 1, errors: [] });
    expect(sdk.syncTeams.mock.calls[0]![0]).toEqual({ marker: 'client' });
    expect(sdk.syncTeams.mock.calls[0]![1]).toEqual(teams);
  });

  it('rejects items that do not match the yml codec', async () => {
    await expect(
      tool('admin_write_teams').handler({ teams: [{ name: 'No description' }] }),
    ).rejects.toThrow(/teams\[0\] does not match/);
    expect(sdk.syncTeams).not.toHaveBeenCalled();
  });

  it('returns collected errors when the sync fails', async () => {
    sdk.syncTeams.mockImplementation(async (_c, _i, { logger }) => {
      logger.error('Failed to sync team "Legal"! - boom');
      logger.warn('careful');
      return false;
    });
    const result = await tool('admin_write_teams').handler({
      teams: [{ name: 'Legal', description: 'd' }],
    });
    expect(result).toEqual({
      success: false,
      count: 1,
      errors: ['Failed to sync team "Legal"! - boom'],
      warnings: ['careful'],
    });
  });
});
