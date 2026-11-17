import type { ToolClients } from '@transcend-io/mcp-server-base';
import { RequestAction } from '@transcend-io/privacy-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  fetchAllEnrichers: vi.fn(),
  fetchAllActions: vi.fn(),
  syncEnricher: vi.fn(),
  syncAction: vi.fn(),
  fetchIdentifiersAndCreateMissing: vi.fn(),
  ensureAllDataSubjectsExist: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  fetchAllEnrichers: sdk.fetchAllEnrichers,
  fetchAllActions: sdk.fetchAllActions,
  syncEnricher: sdk.syncEnricher,
  syncAction: sdk.syncAction,
  fetchIdentifiersAndCreateMissing: sdk.fetchIdentifiersAndCreateMissing,
}));

vi.mock('@transcend-io/sdk/transcend-yml', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk/transcend-yml')>()),
  ensureAllDataSubjectsExist: sdk.ensureAllDataSubjectsExist,
}));

vi.mock('@transcend-io/mcp-server-base', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/mcp-server-base')>()),
  createGraphqlRequestClient: () => ({ marker: 'client' }),
}));

const { getDSRTools } = await import('../src/tools/index.js');

const clients = {
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

const tool = (name: string) => getDSRTools(clients).find((t) => t.name === name)!;
const run = (name: string, input: unknown) => {
  const t = tool(name);
  return t.handler(t.zodSchema.parse(input) as never) as Promise<Record<string, any>>;
};

beforeEach(() => {
  for (const mock of Object.values(sdk)) mock.mockReset();
  sdk.fetchIdentifiersAndCreateMissing.mockResolvedValue({ email: { id: 'i1', name: 'email' } });
  sdk.ensureAllDataSubjectsExist.mockResolvedValue({});
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
  it('returns enrichers in transcend.yml shape and passes the title filter', async () => {
    sdk.fetchAllEnrichers.mockResolvedValue([
      {
        id: 'e1',
        title: 'Lookup',
        url: 'https://example.com',
        type: 'SERVER',
        inputIdentifier: { name: 'email' },
        actions: Object.values(RequestAction),
        identifiers: [{ name: 'userId' }],
        dataSubjects: [{ type: 'customer' }],
        expirationDuration: '60000',
        phoneNumbers: [],
        regionList: [],
      },
    ]);
    const result = await run('dsr_list_enrichers', { title: 'Lookup' });
    expect(sdk.fetchAllEnrichers).toHaveBeenCalledWith(
      { marker: 'client' },
      expect.objectContaining({ filterBy: { title: 'Lookup' } }),
    );
    expect(result).toMatchObject({
      count: 1,
      enrichers: [
        {
          title: 'Lookup',
          'input-identifier': 'email',
          'output-identifiers': ['userId'],
          'privacy-actions': undefined,
          'data-subjects': ['customer'],
          expirationDuration: 60000,
        },
      ],
    });
  });
});

describe('dsr_list_actions', () => {
  it('returns erasure-only flags only for erasure', async () => {
    sdk.fetchAllActions.mockResolvedValue([
      {
        id: 'a1',
        type: RequestAction.Access,
        skipSecondaryIfNoFiles: true,
        skipDownloadableStep: true,
        requiresReview: true,
        waitingPeriod: 45,
        regionDetectionMethod: 'AUTO',
        regionList: [],
      },
    ]);
    const result = await run('dsr_list_actions', {});
    expect(result.actions[0]).toEqual({
      type: 'ACCESS',
      requiresReview: true,
      waitingPeriod: 45,
      regionDetectionMethod: 'AUTO',
      regionList: undefined,
    });
  });
});

describe('dsr_write_enrichers', () => {
  const enricher = {
    title: 'Lookup',
    'input-identifier': 'email',
    'output-identifiers': ['email'],
  };

  it('syncs each valid item', async () => {
    sdk.fetchAllEnrichers.mockResolvedValue([]);
    const result = await run('dsr_write_enrichers', { enrichers: [enricher] });
    expect(sdk.syncEnricher).toHaveBeenCalledTimes(1);
    expect(sdk.syncEnricher.mock.calls[0]![1]).toMatchObject({ input: enricher });
    expect(sdk.fetchIdentifiersAndCreateMissing.mock.calls[0]![1]).toMatchObject({
      skipPublish: true,
    });
    expect(result).toMatchObject({ success: true, synced: 1, errors: [] });
  });

  it('reports items that fail validation without calling the SDK', async () => {
    const result = await run('dsr_write_enrichers', { enrichers: [{ title: 'Bad' }] });
    expect(sdk.syncEnricher).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.errors[0]).toMatchObject({ item: 'Bad' });
  });

  it('refuses to create an enricher without an input identifier', async () => {
    sdk.fetchAllEnrichers.mockResolvedValue([]);
    const result = await run('dsr_write_enrichers', {
      enrichers: [{ title: 'New', 'output-identifiers': ['email'] }],
    });
    expect(sdk.syncEnricher).not.toHaveBeenCalled();
    expect(result.errors[0].message).toMatch(/input-identifier/);
  });

  it('allows updating an existing enricher without an input identifier', async () => {
    sdk.fetchAllEnrichers.mockResolvedValue([{ id: 'e1', title: 'Old' }]);
    const result = await run('dsr_write_enrichers', {
      enrichers: [{ title: 'Old', 'output-identifiers': ['email'] }],
    });
    expect(sdk.syncEnricher).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it('collects SDK failures per item', async () => {
    sdk.fetchAllEnrichers.mockResolvedValue([]);
    sdk.syncEnricher.mockRejectedValueOnce(new Error('boom'));
    const result = await run('dsr_write_enrichers', { enrichers: [enricher] });
    expect(result).toMatchObject({
      success: false,
      synced: 0,
      errors: [{ item: 'Lookup', message: 'boom' }],
    });
  });
});

describe('dsr_write_actions', () => {
  it('updates the matching action by type', async () => {
    sdk.fetchAllActions.mockResolvedValue([{ id: 'a1', type: 'ACCESS' }]);
    const result = await run('dsr_write_actions', {
      actions: [{ type: 'ACCESS', requiresReview: false }],
      publishToPrivacyCenter: true,
    });
    expect(sdk.syncAction).toHaveBeenCalledWith(
      { marker: 'client' },
      { action: { type: 'ACCESS', requiresReview: false }, actionId: 'a1', skipPublish: false },
      expect.anything(),
    );
    expect(result).toMatchObject({ success: true, synced: 1, errors: [] });
  });

  it('errors on an unknown action type', async () => {
    sdk.fetchAllActions.mockResolvedValue([{ id: 'a1', type: 'ACCESS' }]);
    const result = await run('dsr_write_actions', { actions: [{ type: 'ERASURE' }] });
    expect(sdk.syncAction).not.toHaveBeenCalled();
    expect(result.errors[0]).toMatchObject({ item: 'ERASURE' });
  });

  it('reports invalid items', async () => {
    const result = await run('dsr_write_actions', { actions: [{ type: 'NOT_A_TYPE' }] });
    expect(sdk.fetchAllActions).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});
