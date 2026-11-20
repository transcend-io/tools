import type { ToolClients } from '@transcend-io/mcp-server-base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  sync: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  syncConfigurationToTranscend: sdk.sync,
}));

vi.mock('@transcend-io/mcp-server-base/transcend-yml', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@transcend-io/mcp-server-base/transcend-yml')>();
  return {
    ...actual,
    pushYmlSection: vi.fn(async (_clients, section, count) => {
      const result = await sdk.sync(
        section,
        { marker: 'client' },
        { publishToPrivacyCenter: false },
      );
      return { success: result.success, count, errors: result.errors ?? [] };
    }),
  };
});

const { getConsentTools } = await import('../src/tools/index.js');

const clients = {
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

const tool = (name: string) => getConsentTools(clients).find((t) => t.name === name)!;

beforeEach(() => {
  sdk.sync.mockReset();
  sdk.sync.mockResolvedValue({ success: true, errors: [] });
});

describe('consent_write_consent_manager', () => {
  it('syncs a valid consent manager through the inventory push pipeline', async () => {
    const result = await tool('consent_write_consent_manager').handler({
      consentManager: { domains: ['example.com'], consentPrecedence: 'user' },
    } as never);
    expect(sdk.sync).toHaveBeenCalledWith(
      { 'consent-manager': { domains: ['example.com'], consentPrecedence: 'user' } },
      { marker: 'client' },
      expect.objectContaining({ publishToPrivacyCenter: false }),
    );
    expect(result).toMatchObject({ success: true, count: 1, errors: [] });
  });

  it('rejects a value the yml codec rejects', async () => {
    await expect(
      tool('consent_write_consent_manager').handler({
        consentManager: { domains: 'not-an-array' },
      } as never),
    ).rejects.toThrow(/consent-manager does not match/);
    expect(sdk.sync).not.toHaveBeenCalled();
  });

  it('returns sync errors instead of throwing', async () => {
    sdk.sync.mockResolvedValue({
      success: false,
      errors: [{ resource: 'consent-manager', message: 'Partition "x" not found' }],
    });
    const result = await tool('consent_write_consent_manager').handler({
      consentManager: { partition: 'x' },
    } as never);
    expect(result).toMatchObject({
      success: false,
      errors: [{ resource: 'consent-manager', message: 'Partition "x" not found' }],
    });
  });
});

describe('consent_write_purposes', () => {
  it('syncs purposes through syncConfigurationToTranscend', async () => {
    const purpose = {
      trackingType: 'Foo',
      name: 'Foo',
      title: 'Foo',
      'preference-topics': [
        { slug: 'News', type: 'BOOLEAN', title: 'News', description: 'News emails' },
      ],
    };
    const result = await tool('consent_write_purposes').handler({ purposes: [purpose] } as never);
    expect(sdk.sync).toHaveBeenCalledWith(
      { purposes: [purpose] },
      { marker: 'client' },
      expect.anything(),
    );
    expect(result).toMatchObject({ success: true, count: 1, errors: [] });
  });

  it('rejects a purpose without a name', async () => {
    await expect(
      tool('consent_write_purposes').handler({
        purposes: [{ trackingType: 'Foo', title: 'Foo' }],
      } as never),
    ).rejects.toThrow(/purposes\[0\]/);
    expect(sdk.sync).not.toHaveBeenCalled();
  });
});
