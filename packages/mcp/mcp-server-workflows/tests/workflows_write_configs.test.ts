import type { ToolClients } from '@transcend-io/mcp-server-base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ sync: vi.fn() }));

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
      const result = await sdk.sync(section, { marker: 'client' }, options);
      return { success: result.success, count, errors: result.errors ?? [] };
    }),
  };
});

const { getWorkflowTools } = await import('../src/index.js');

const clients = {
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

const tool = getWorkflowTools(clients).find((t) => t.name === 'workflows_write_configs')!;

describe('workflows_write_configs', () => {
  beforeEach(() => {
    sdk.sync.mockReset();
    sdk.sync.mockResolvedValue({ success: true, errors: [] });
  });

  it('is a non-destructive idempotent write', () => {
    expect(tool.readOnly).toBe(false);
    expect(tool.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    });
  });

  it('calls syncConfigurationToTranscend with workflow-configs', async () => {
    await tool.handler({
      workflowConfigs: [
        {
          title: 'Customer Data Access Request',
          'action-type': 'ACCESS',
          'internal-name': 'customer-access-workflow',
        },
      ],
    });

    expect(sdk.sync).toHaveBeenCalledWith(
      {
        'workflow-configs': [
          expect.objectContaining({
            title: 'Customer Data Access Request',
            'action-type': 'ACCESS',
            'internal-name': 'customer-access-workflow',
          }),
        ],
      },
      { marker: 'client' },
      expect.objectContaining({ publishToPrivacyCenter: false }),
    );
  });

  it('rejects duplicate internal names in one batch', async () => {
    await expect(
      tool.handler({
        workflowConfigs: [
          { title: 'A', 'action-type': 'ACCESS', 'internal-name': 'dup' },
          { title: 'B', 'action-type': 'ERASURE', 'internal-name': 'dup' },
        ],
      }),
    ).rejects.toThrow(/duplicate/i);
  });
});
