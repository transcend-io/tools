import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  syncPrivacyCenter: vi.fn(),
  syncIntlMessages: vi.fn(),
  syncPolicies: vi.fn(),
  fetchAllMessages: vi.fn(),
  fetchAllPolicies: vi.fn(),
  fetchAllPrivacyCenters: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  ...sdk,
}));

vi.mock('@transcend-io/mcp-server-base', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/mcp-server-base')>()),
  createGraphqlRequestClient: () => ({ marker: 'client' }),
}));

const { getPrivacyCenterTools } = await import('../src/index.js');

const tools = getPrivacyCenterTools({
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
});
const tool = (name: string) => tools.find((t) => t.name === name)!;

beforeEach(() => {
  for (const fn of Object.values(sdk)) fn.mockReset();
});

describe('annotations', () => {
  it('marks list tools read only and writes idempotent', () => {
    for (const name of [
      'privacy_center_list_intl_messages',
      'privacy_center_list_policies',
      'privacy_center_get',
    ]) {
      expect(tool(name).readOnly).toBe(true);
    }
    for (const name of [
      'privacy_center_write',
      'privacy_center_write_intl_messages',
      'privacy_center_write_policies',
    ]) {
      expect(tool(name).readOnly).toBe(false);
      expect(tool(name).annotations.idempotentHint).toBe(true);
    }
  });
});

describe('privacy_center_write', () => {
  it('skips publishing by default', async () => {
    sdk.syncPrivacyCenter.mockResolvedValue(true);
    const result = await tool('privacy_center_write').handler({
      privacyCenter: { showPolicies: true },
    });
    expect(result).toMatchObject({ success: true, count: 1 });
    expect(sdk.syncPrivacyCenter.mock.calls[0]![1]).toEqual({ showPolicies: true });
    expect(sdk.syncPrivacyCenter.mock.calls[0]![2]).toMatchObject({ skipPublish: true });
  });

  it('publishes when asked', async () => {
    sdk.syncPrivacyCenter.mockResolvedValue(true);
    await tool('privacy_center_write').handler({
      privacyCenter: { isDisabled: false },
      publish: true,
    });
    expect(sdk.syncPrivacyCenter.mock.calls[0]![2]).toMatchObject({ skipPublish: false });
  });

  it('rejects a wrong field type', async () => {
    await expect(
      tool('privacy_center_write').handler({ privacyCenter: { showPolicies: 'yes' } }),
    ).rejects.toThrow(/does not match/);
  });
});

describe('privacy_center_write_intl_messages', () => {
  it('syncs messages', async () => {
    sdk.syncIntlMessages.mockResolvedValue(true);
    const messages = [{ id: 'm1', defaultMessage: 'Hi', translations: { 'es-ES': 'Hola' } }];
    const result = await tool('privacy_center_write_intl_messages').handler({ messages });
    expect(result).toEqual({ success: true, count: 1, errors: [] });
    expect(sdk.syncIntlMessages.mock.calls[0]![1]).toEqual(messages);
  });

  it('reports a thrown duplicate error as a failed result', async () => {
    sdk.syncIntlMessages.mockRejectedValue(new Error('non-unique entries found: m1'));
    const result = await tool('privacy_center_write_intl_messages').handler({
      messages: [{ id: 'm1' }, { id: 'm1' }],
    });
    expect(result).toEqual({
      success: false,
      count: 2,
      errors: ['non-unique entries found: m1'],
    });
  });
});

describe('privacy_center_write_policies', () => {
  it('syncs policies', async () => {
    sdk.syncPolicies.mockResolvedValue(true);
    const policies = [{ title: 'Privacy Policy', content: '<p>hi</p>' }];
    const result = await tool('privacy_center_write_policies').handler({ policies });
    expect(result).toEqual({ success: true, count: 1, errors: [] });
    expect(sdk.syncPolicies.mock.calls[0]![1]).toEqual(policies);
  });

  it('rejects an unknown policy type', async () => {
    await expect(
      tool('privacy_center_write_policies').handler({ policies: [{ title: 'X', type: 'NOPE' }] }),
    ).rejects.toThrow(/policies\[0\] does not match/);
  });
});

describe('privacy_center_list_intl_messages', () => {
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
    const result = (await tool('privacy_center_list_intl_messages').handler({
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
    const result = (await tool('privacy_center_list_intl_messages').handler({
      limit: 1,
      offset: 0,
      includeTranslations: true,
    })) as { data: Record<string, unknown>[]; hasNextPage: boolean };
    expect(result.data[0]).toMatchObject({ translations: { 'es-ES': 'Hola' } });
    expect(result.hasNextPage).toBe(true);
  });
});

describe('privacy_center_list_policies', () => {
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
    const result = (await tool('privacy_center_list_policies').handler({
      limit: 50,
      offset: 0,
    })) as { data: Record<string, unknown>[] };
    expect(result.data[0]).toMatchObject({ id: 'p1', title: 'Privacy Policy', versionCount: 1 });
    expect(JSON.stringify(result)).not.toContain('full text');
  });

  it('includes content when asked', async () => {
    sdk.fetchAllPolicies.mockResolvedValue(policies);
    const result = (await tool('privacy_center_list_policies').handler({
      limit: 50,
      offset: 0,
      includeContent: true,
    })) as { data: Record<string, unknown>[] };
    expect(result.data[0]).toMatchObject({ content: '<p>full text</p>' });
  });
});
