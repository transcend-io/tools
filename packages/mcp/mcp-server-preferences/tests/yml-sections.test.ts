import type { ToolClients } from '@transcend-io/mcp-server-base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  syncPartitions: vi.fn(),
  fetchAllPreferenceOptionValues: vi.fn(),
  syncPreferenceOptionValues: vi.fn(),
  fetchAllConsentWorkflowTriggers: vi.fn(),
  convertConsentWorkflowTriggersToInputs: vi.fn(),
  syncConsentWorkflowTriggers: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  ...sdk,
}));

vi.mock('@transcend-io/mcp-server-base', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/mcp-server-base')>()),
  createGraphqlRequestClient: () => ({ marker: 'client' }),
}));

const { getPreferenceTools } = await import('../src/index.js');

const clients = {
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

const tools = getPreferenceTools(clients);
const tool = (name: string) => tools.find((t) => t.name === name)!;

beforeEach(() => {
  for (const fn of Object.values(sdk)) fn.mockReset();
});

describe('write tools are not confirmation gated', () => {
  it.each([
    'preferences_write_partitions',
    'preferences_write_option_values',
    'preferences_write_workflow_configs',
  ])('%s', (name) => {
    expect(tool(name).confirmation).toBeUndefined();
    expect(tool(name).readOnly).toBe(false);
    expect(tool(name).annotations).toMatchObject({ destructiveHint: false, idempotentHint: true });
  });
});

describe('preferences_write_partitions', () => {
  it('passes decoded items to syncPartitions', async () => {
    sdk.syncPartitions.mockResolvedValue(true);
    const result = await tool('preferences_write_partitions').handler({
      partitions: [{ name: 'EU' }, { name: 'US' }],
    });
    expect(result).toEqual({ success: true, errors: [], count: 2 });
    expect(sdk.syncPartitions.mock.calls[0]![1]).toEqual([{ name: 'EU' }, { name: 'US' }]);
  });

  it('reports logged errors when the sync fails', async () => {
    sdk.syncPartitions.mockImplementation(async (_client, _items, { logger }) => {
      logger.error('Failed to create consent partition: EU!');
      logger.info('ignored');
      return false;
    });
    const result = (await tool('preferences_write_partitions').handler({
      partitions: [{ name: 'EU' }],
    })) as { success: boolean; errors: string[] };
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['Failed to create consent partition: EU!']);
  });

  it('turns a thrown error into a failed result', async () => {
    sdk.syncPartitions.mockRejectedValue(new Error('no consent manager'));
    const result = (await tool('preferences_write_partitions').handler({
      partitions: [{ name: 'EU' }],
    })) as { success: boolean; errors: string[] };
    expect(result).toMatchObject({ success: false, errors: ['no consent manager'] });
  });
});

describe('preferences_list_option_values', () => {
  it('returns slugs and plain titles', async () => {
    sdk.fetchAllPreferenceOptionValues.mockResolvedValue([
      { id: 'a', slug: 'daily', title: { id: 't', defaultMessage: 'Daily' } },
    ]);
    const result = await tool('preferences_list_option_values').handler({});
    expect(result).toEqual({
      count: 1,
      optionValues: [{ id: 'a', slug: 'daily', title: 'Daily' }],
    });
  });
});

describe('preferences_write_option_values', () => {
  it('passes decoded items to syncPreferenceOptionValues', async () => {
    sdk.syncPreferenceOptionValues.mockResolvedValue(true);
    const result = await tool('preferences_write_option_values').handler({
      optionValues: [{ slug: 'daily', title: 'Daily' }],
    });
    expect(result).toEqual({ success: true, errors: [], count: 1 });
    expect(sdk.syncPreferenceOptionValues.mock.calls[0]![1]).toEqual([
      { slug: 'daily', title: 'Daily' },
    ]);
  });
});

describe('preferences_list_workflow_configs', () => {
  it('returns trigger inputs in yml shape', async () => {
    const triggers = [{ id: 't1' }];
    const configs = [
      { name: 'Opt out', purposes: [{ 'tracking-type': 'Sale', 'matching-state': false }] },
    ];
    sdk.fetchAllConsentWorkflowTriggers.mockResolvedValue(triggers);
    sdk.convertConsentWorkflowTriggersToInputs.mockResolvedValue(configs);
    const result = await tool('preferences_list_workflow_configs').handler({});
    expect(result).toEqual({ count: 1, workflowConfigs: configs });
    expect(sdk.convertConsentWorkflowTriggersToInputs.mock.calls[0]![1]).toBe(triggers);
  });
});

describe('preferences_write_workflow_configs', () => {
  it('passes decoded items to syncConsentWorkflowTriggers', async () => {
    sdk.syncConsentWorkflowTriggers.mockResolvedValue(true);
    const item = {
      name: 'Opt out',
      purposes: [{ 'tracking-type': 'Sale', 'matching-state': false }],
      'action-type': 'ERASURE',
      'data-subject-type': 'customer',
    };
    const result = await tool('preferences_write_workflow_configs').handler({
      workflowConfigs: [item],
    });
    expect(result).toEqual({ success: true, errors: [], count: 1 });
    expect(sdk.syncConsentWorkflowTriggers.mock.calls[0]![1]).toEqual([item]);
  });

  it('rejects an action type the yml codec does not accept', async () => {
    await expect(
      tool('preferences_write_workflow_configs').handler({
        workflowConfigs: [
          {
            name: 'x',
            purposes: [{ 'tracking-type': 'Sale', 'matching-state': true }],
            'action-type': 'NOPE',
          },
        ],
      }),
    ).rejects.toThrow(/preference-workflow-configs\[0\] is not valid/);
    expect(sdk.syncConsentWorkflowTriggers).not.toHaveBeenCalled();
  });
});
