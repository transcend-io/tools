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
    pushYmlSection: vi.fn(async (_clients, section, count) => {
      const result = await sdk.sync(section, { marker: 'client' }, {});
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

const tool = getWorkflowTools(clients).find((t) => t.name === 'workflows_write_email_templates')!;

describe('workflows_write_email_templates', () => {
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

  it('rejects an empty list', () => {
    expect(tool.zodSchema.safeParse({ templates: [] }).success).toBe(false);
  });

  it('syncs every template', async () => {
    const templates = [{ title: 'A' }, { title: 'B' }];
    const result = await tool.handler({ templates });
    expect(result).toEqual({ success: true, count: 2, errors: [] });
    expect(sdk.sync).toHaveBeenCalledWith({ templates }, { marker: 'client' }, expect.any(Object));
  });

  it('rejects an item the yml codec would reject, before any write', async () => {
    await expect(tool.handler({ templates: [{ title: 'A' }, { name: 'x' }] })).rejects.toThrow(
      /templates\[1\] does not match/,
    );
    expect(sdk.sync).not.toHaveBeenCalled();
  });

  it('collects per-template failures', async () => {
    sdk.sync.mockResolvedValue({
      success: false,
      errors: [
        { resource: 'templates', item: 'A', message: 'Failed to sync template "A"! - boom' },
      ],
    });
    const result = await tool.handler({ templates: [{ title: 'A' }, { title: 'B' }] });
    expect(result).toEqual({
      success: false,
      count: 2,
      errors: [
        { resource: 'templates', item: 'A', message: 'Failed to sync template "A"! - boom' },
      ],
    });
  });
});
