import type { ToolClients } from '@transcend-io/mcp-server-base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  fetchActionItems: vi.fn(),
  fetchCollections: vi.fn(),
  syncActionItems: vi.fn(),
  syncCollections: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  fetchAllActionItems: sdk.fetchActionItems,
  fetchAllActionItemCollections: sdk.fetchCollections,
  syncActionItems: sdk.syncActionItems,
  syncActionItemCollections: sdk.syncCollections,
}));

vi.mock('@transcend-io/mcp-server-base', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/mcp-server-base')>()),
  createGraphqlRequestClient: () => ({ marker: 'client' }),
}));

const { getWorkflowTools } = await import('../src/index.js');

const clients = {
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

const tool = (name: string) => getWorkflowTools(clients).find((t) => t.name === name)!;

const rawItem = {
  ids: ['a1'],
  id: 'a1',
  title: 'Review vendors',
  type: 'ONBOARDING',
  collections: [{ id: 'c1', title: 'Setup' }],
  resolved: false,
  priority: 'HIGH',
  dueDate: '2026-01-01',
  teams: [{ id: 't1', name: 'Privacy' }],
  users: [{ id: 'u1', email: 'a@example.com' }],
  customerExperienceActionItemIds: ['cx-1'],
  notes: 'long notes',
  link: 'https://example.com',
};

describe('workflows_list_action_items', () => {
  beforeEach(() => {
    sdk.fetchActionItems.mockReset();
    sdk.fetchActionItems.mockResolvedValue([rawItem, { ...rawItem, id: 'a2' }]);
  });

  it('returns compact rows with a total count and passes filters', async () => {
    const result = (await tool('workflows_list_action_items').handler({
      limit: 1,
      offset: 0,
      resolved: false,
      types: ['ONBOARDING'],
    })) as { data: Array<Record<string, unknown>>; totalCount: number; hasNextPage: boolean };

    expect(result.totalCount).toBe(2);
    expect(result.hasNextPage).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: 'a1',
      collections: ['Setup'],
      teams: ['Privacy'],
      users: ['a@example.com'],
      customerExperienceActionItemId: 'cx-1',
    });
    expect(result.data[0]).not.toHaveProperty('notes');
    expect(sdk.fetchActionItems.mock.calls[0]![1]).toEqual({
      filterBy: { resolved: false, type: ['ONBOARDING'] },
    });
  });

  it('rejects unknown type codes', async () => {
    await expect(
      tool('workflows_list_action_items').handler({ limit: 10, offset: 0, types: ['NOPE'] }),
    ).rejects.toThrow(/Unknown action item types: NOPE/);
    expect(sdk.fetchActionItems).not.toHaveBeenCalled();
  });
});

describe('workflows_list_action_item_collections', () => {
  it('pages the collections', async () => {
    sdk.fetchCollections.mockResolvedValue([{ id: '1' }, { id: '2' }, { id: '3' }]);
    const result = (await tool('workflows_list_action_item_collections').handler({
      limit: 2,
      offset: 2,
    })) as { data: unknown[]; totalCount: number; hasNextPage: boolean };
    expect(result.data).toEqual([{ id: '3' }]);
    expect(result.totalCount).toBe(3);
    expect(result.hasNextPage).toBe(false);
  });
});

describe('workflows_write_action_items', () => {
  beforeEach(() => {
    sdk.syncActionItems.mockReset();
  });

  it('is an idempotent, non destructive write', () => {
    const t = tool('workflows_write_action_items');
    expect(t.readOnly).toBe(false);
    expect(t.annotations).toMatchObject({ idempotentHint: true, destructiveHint: false });
  });

  it('syncs decoded items and returns success', async () => {
    sdk.syncActionItems.mockImplementation(async (_client, _items, { logger }) => {
      logger.info('Syncing');
      return true;
    });
    const items = [{ title: 'Review vendors', type: 'ONBOARDING', collections: ['Setup'] }];

    const result = await tool('workflows_write_action_items').handler({ items });

    expect(result).toEqual({ success: true, count: 1, errors: [] });
    expect(sdk.syncActionItems.mock.calls[0]![0]).toEqual({ marker: 'client' });
    expect(sdk.syncActionItems.mock.calls[0]![1]).toEqual(items);
  });

  it('returns logged errors and warnings when the sync fails', async () => {
    sdk.syncActionItems.mockImplementation(async (_client, _items, { logger }) => {
      logger.warn('careful');
      logger.error('Missing action item collections: "Setup"');
      return false;
    });

    const result = await tool('workflows_write_action_items').handler({
      items: [{ title: 'x', type: 'ONBOARDING', collections: ['Setup'] }],
    });

    expect(result).toEqual({
      success: false,
      count: 1,
      errors: ['Missing action item collections: "Setup"'],
      warnings: ['careful'],
    });
  });

  it('rejects items that fail the yml codec before calling the sdk', async () => {
    await expect(
      tool('workflows_write_action_items').handler({
        items: [{ title: 'missing type and collections' }],
      }),
    ).rejects.toThrow(/Action item 0 is invalid/);
    expect(sdk.syncActionItems).not.toHaveBeenCalled();
  });

  it('requires at least one item', () => {
    expect(tool('workflows_write_action_items').zodSchema.safeParse({ items: [] }).success).toBe(
      false,
    );
  });
});

describe('workflows_write_action_item_collections', () => {
  beforeEach(() => {
    sdk.syncCollections.mockReset();
  });

  it('syncs decoded collections', async () => {
    sdk.syncCollections.mockResolvedValue(true);
    const items = [{ title: 'Setup', productLine: 'DSR_AUTOMATION' }];

    const result = await tool('workflows_write_action_item_collections').handler({ items });

    expect(result).toEqual({ success: true, count: 1, errors: [] });
    expect(sdk.syncCollections.mock.calls[0]![1]).toEqual(items);
  });

  it('rejects an invalid product line', async () => {
    await expect(
      tool('workflows_write_action_item_collections').handler({
        items: [{ title: 'Setup', productLine: 'NOPE' }],
      }),
    ).rejects.toThrow(/Collection item 0 is invalid/);
    expect(sdk.syncCollections).not.toHaveBeenCalled();
  });
});
