import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  syncTeams: vi.fn(),
  syncPrivacyCenter: vi.fn(),
  syncIntlMessages: vi.fn(),
  syncPolicies: vi.fn(),
  fetchAllMessages: vi.fn(),
  fetchAllPolicies: vi.fn(),
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
    for (const name of [
      'admin_write_privacy_center',
      'admin_write_intl_messages',
      'admin_write_privacy_policies',
    ]) {
      expect(tool(name).confirmation).toBeUndefined();
    }
  });

  it('marks list tools read only and writes idempotent', () => {
    for (const name of ['admin_list_intl_messages', 'admin_list_privacy_policies']) {
      expect(tool(name).readOnly).toBe(true);
    }
    for (const name of [
      'admin_write_teams',
      'admin_write_privacy_center',
      'admin_write_intl_messages',
      'admin_write_privacy_policies',
    ]) {
      expect(tool(name).readOnly).toBe(false);
      expect(tool(name).annotations.idempotentHint).toBe(true);
    }
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

describe('admin_write_privacy_center', () => {
  it('skips publishing by default', async () => {
    sdk.syncPrivacyCenter.mockResolvedValue(true);
    const result = await tool('admin_write_privacy_center').handler({
      privacyCenter: { showPolicies: true },
    });
    expect(result).toMatchObject({ success: true, count: 1 });
    expect(sdk.syncPrivacyCenter.mock.calls[0]![1]).toEqual({ showPolicies: true });
    expect(sdk.syncPrivacyCenter.mock.calls[0]![2]).toMatchObject({ skipPublish: true });
  });

  it('publishes when asked', async () => {
    sdk.syncPrivacyCenter.mockResolvedValue(true);
    await tool('admin_write_privacy_center').handler({
      privacyCenter: { isDisabled: false },
      publish: true,
    });
    expect(sdk.syncPrivacyCenter.mock.calls[0]![2]).toMatchObject({ skipPublish: false });
  });

  it('rejects a wrong field type', async () => {
    await expect(
      tool('admin_write_privacy_center').handler({ privacyCenter: { showPolicies: 'yes' } }),
    ).rejects.toThrow(/does not match/);
  });
});

describe('admin_write_intl_messages', () => {
  it('syncs messages', async () => {
    sdk.syncIntlMessages.mockResolvedValue(true);
    const messages = [{ id: 'm1', defaultMessage: 'Hi', translations: { 'es-ES': 'Hola' } }];
    const result = await tool('admin_write_intl_messages').handler({ messages });
    expect(result).toEqual({ success: true, count: 1, errors: [] });
    expect(sdk.syncIntlMessages.mock.calls[0]![1]).toEqual(messages);
  });

  it('reports a thrown duplicate error as a failed result', async () => {
    sdk.syncIntlMessages.mockRejectedValue(new Error('non-unique entries found: m1'));
    const result = await tool('admin_write_intl_messages').handler({
      messages: [{ id: 'm1' }, { id: 'm1' }],
    });
    expect(result).toEqual({
      success: false,
      count: 2,
      errors: ['non-unique entries found: m1'],
    });
  });
});

describe('admin_write_privacy_policies', () => {
  it('syncs policies', async () => {
    sdk.syncPolicies.mockResolvedValue(true);
    const policies = [{ title: 'Privacy Policy', content: '<p>hi</p>' }];
    const result = await tool('admin_write_privacy_policies').handler({ policies });
    expect(result).toEqual({ success: true, count: 1, errors: [] });
    expect(sdk.syncPolicies.mock.calls[0]![1]).toEqual(policies);
  });

  it('rejects an unknown policy type', async () => {
    await expect(
      tool('admin_write_privacy_policies').handler({ policies: [{ title: 'X', type: 'NOPE' }] }),
    ).rejects.toThrow(/policies\[0\] does not match/);
  });
});

describe('admin_list_intl_messages', () => {
  const messages = [
    {
      id: 'a',
      defaultMessage: 'Hello',
      description: 'greeting',
      targetReactIntlId: null,
      translations: [{ locale: 'es-ES', value: 'Hola' }],
    },
    {
      id: 'b',
      defaultMessage: 'Bye',
      description: 'farewell',
      targetReactIntlId: 'x.y',
      translations: [],
    },
  ];

  it('omits translations by default and filters by text', async () => {
    sdk.fetchAllMessages.mockResolvedValue(messages);
    const result = (await tool('admin_list_intl_messages').handler({
      limit: 50,
      offset: 0,
      text: 'hello',
    })) as { data: Record<string, unknown>[]; totalCount: number };
    expect(result.totalCount).toBe(1);
    expect(result.data[0]).toMatchObject({ id: 'a', translationCount: 1 });
    expect(result.data[0]).not.toHaveProperty('translations');
  });

  it('includes translations and paginates', async () => {
    sdk.fetchAllMessages.mockResolvedValue(messages);
    const result = (await tool('admin_list_intl_messages').handler({
      limit: 1,
      offset: 0,
      includeTranslations: true,
    })) as { data: Record<string, unknown>[]; hasNextPage: boolean };
    expect(result.data[0]).toMatchObject({ translations: { 'es-ES': 'Hola' } });
    expect(result.hasNextPage).toBe(true);
  });
});

describe('admin_list_privacy_policies', () => {
  const policies = [
    {
      id: 'p1',
      title: { defaultMessage: 'Privacy Policy' },
      type: 'PRIVACY_POLICY',
      disabledLocales: [],
      versions: [{ content: { defaultMessage: '<p>full text</p>' } }],
    },
  ];

  it('omits content by default', async () => {
    sdk.fetchAllPolicies.mockResolvedValue(policies);
    const result = (await tool('admin_list_privacy_policies').handler({
      limit: 50,
      offset: 0,
    })) as { data: Record<string, unknown>[] };
    expect(result.data[0]).toMatchObject({ id: 'p1', title: 'Privacy Policy', versionCount: 1 });
    expect(JSON.stringify(result)).not.toContain('full text');
  });

  it('includes content when asked', async () => {
    sdk.fetchAllPolicies.mockResolvedValue(policies);
    const result = (await tool('admin_list_privacy_policies').handler({
      limit: 50,
      offset: 0,
      includeContent: true,
    })) as { data: Record<string, unknown>[] };
    expect(result.data[0]).toMatchObject({ content: '<p>full text</p>' });
  });
});
