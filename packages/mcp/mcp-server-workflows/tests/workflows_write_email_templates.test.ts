import type { ToolClients } from '@transcend-io/mcp-server-base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ syncTemplate: vi.fn() }));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  syncTemplate: sdk.syncTemplate,
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

const tool = getWorkflowTools(clients).find((t) => t.name === 'workflows_write_email_templates')!;

describe('workflows_write_email_templates', () => {
  beforeEach(() => {
    sdk.syncTemplate.mockReset();
    sdk.syncTemplate.mockResolvedValue(undefined);
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
    const result = await tool.handler({ templates: [{ title: 'A' }, { title: 'B' }] });
    expect(result).toEqual({ success: true, synced: 2, errors: [] });
    expect(sdk.syncTemplate).toHaveBeenCalledTimes(2);
    expect(sdk.syncTemplate.mock.calls[0]![0]).toEqual({ marker: 'client' });
    expect(sdk.syncTemplate.mock.calls[0]![1]).toEqual({ title: 'A' });
  });

  it('rejects an item the yml codec would reject, before any write', async () => {
    await expect(tool.handler({ templates: [{ title: 'A' }, { name: 'x' }] })).rejects.toThrow(
      /Invalid email template/,
    );
    expect(sdk.syncTemplate).not.toHaveBeenCalled();
  });

  it('collects per-template failures', async () => {
    sdk.syncTemplate.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
    const result = (await tool.handler({ templates: [{ title: 'A' }, { title: 'B' }] })) as {
      success: boolean;
      synced: number;
      errors: string[];
    };
    expect(result.success).toBe(false);
    expect(result.synced).toBe(1);
    expect(result.errors[0]).toContain('"A"');
    expect(result.errors[0]).toContain('boom');
  });
});
