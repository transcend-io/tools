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
    pushYmlSection: vi.fn(async (_clients, section, count) => {
      const result = await sdk.sync(section, { marker: 'client' }, {});
      return { success: result.success, count, errors: result.errors ?? [] };
    }),
    listAllYmlSection: vi.fn(async () => {
      const config = (await sdk.pull({ marker: 'client' }, {})) as Record<string, unknown[]>;
      const key = Object.keys(config)[0];
      const data = key ? config[key]! : [];
      return { data, totalCount: data.length, hasNextPage: false };
    }),
  };
});

const { getPreferenceTools } = await import('../src/index.js');

const clients = {
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

const tools = getPreferenceTools(clients);
const tool = (name: string) => tools.find((t) => t.name === name)!;

beforeEach(() => {
  sdk.pull.mockReset();
  sdk.sync.mockReset();
  sdk.sync.mockResolvedValue({ success: true, errors: [] });
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
  it('calls syncConfigurationToTranscend with partitions only', async () => {
    const result = await tool('preferences_write_partitions').handler({
      partitions: [{ name: 'EU' }, { name: 'US' }],
    });
    expect(result).toEqual({ success: true, count: 2, errors: [] });
    expect(sdk.sync.mock.calls[0]![0]).toEqual({ partitions: [{ name: 'EU' }, { name: 'US' }] });
  });
});

describe('preferences_list_option_values', () => {
  it('returns the pull page', async () => {
    sdk.pull.mockResolvedValue({
      'preference-options': [{ slug: 'daily', title: 'Daily' }],
    });
    const result = (await tool('preferences_list_option_values').handler({})) as {
      data: unknown[];
    };
    expect(result.data[0]).toMatchObject({ slug: 'daily' });
  });
});

describe('preferences_write_option_values', () => {
  it('syncs preference-options', async () => {
    await tool('preferences_write_option_values').handler({
      optionValues: [{ slug: 'daily', title: 'Daily' }],
    });
    expect(sdk.sync.mock.calls[0]![0]).toEqual({
      'preference-options': [{ slug: 'daily', title: 'Daily' }],
    });
  });
});

describe('preferences_list_workflow_configs', () => {
  it('returns workflow configs from pull', async () => {
    const configs = [{ name: 'Opt out' }];
    sdk.pull.mockResolvedValue({ 'preference-workflow-configs': configs });
    const result = (await tool('preferences_list_workflow_configs').handler({})) as {
      data: unknown[];
    };
    expect(result.data).toEqual(configs);
  });
});

describe('preferences_write_workflow_configs', () => {
  it('syncs workflow configs', async () => {
    const item = {
      name: 'Opt out',
      purposes: [{ 'tracking-type': 'Sale', 'matching-state': false }],
      'action-type': 'ERASURE',
      'data-subject-type': 'customer',
    };
    await tool('preferences_write_workflow_configs').handler({ workflowConfigs: [item] });
    expect(sdk.sync.mock.calls[0]![0]).toEqual({ 'preference-workflow-configs': [item] });
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
    ).rejects.toThrow(/preference-workflow-configs\[0\]/);
    expect(sdk.sync).not.toHaveBeenCalled();
  });
});
