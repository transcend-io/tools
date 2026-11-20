import type { ToolClients } from '@transcend-io/mcp-server-base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  syncConsentManager: vi.fn(),
  syncPurposes: vi.fn(),
  syncPreferenceTopics: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  ...sdk,
}));

vi.mock('@transcend-io/mcp-server-base', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/mcp-server-base')>()),
  createGraphqlRequestClient: () => ({ marker: 'client' }),
}));

const { getConsentTools } = await import('../src/tools/index.js');

const clients = {
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

const tool = (name: string) => getConsentTools(clients).find((t) => t.name === name)!;
const parse = (result: unknown) => result as { data: Record<string, any> };

describe('consent_write_consent_manager', () => {
  beforeEach(() => {
    sdk.syncConsentManager.mockReset();
    sdk.syncConsentManager.mockResolvedValue(undefined);
  });

  it('syncs a valid consent manager and reports success', async () => {
    const result = await tool('consent_write_consent_manager').handler({
      consentManager: { domains: ['example.com'], consentPrecedence: 'user' },
    } as never);
    expect(sdk.syncConsentManager).toHaveBeenCalledWith(
      { marker: 'client' },
      { domains: ['example.com'], consentPrecedence: 'user' },
      expect.objectContaining({ logger: expect.anything() }),
    );
    expect(parse(result).data).toMatchObject({ success: true, errors: [] });
  });

  it('rejects a value the yml codec rejects', async () => {
    await expect(
      tool('consent_write_consent_manager').handler({
        consentManager: { domains: 'not-an-array' },
      } as never),
    ).rejects.toThrow(/items\[0\] is not valid/);
    expect(sdk.syncConsentManager).not.toHaveBeenCalled();
  });

  it('returns the SDK error instead of throwing', async () => {
    sdk.syncConsentManager.mockRejectedValue(new Error('Partition "x" not found'));
    const result = await tool('consent_write_consent_manager').handler({
      consentManager: { partition: 'x' },
    } as never);
    expect(parse(result).data).toMatchObject({
      success: false,
      errors: [{ resource: 'consent-manager', message: 'Partition "x" not found' }],
    });
  });
});

describe('consent_write_purposes', () => {
  beforeEach(() => {
    sdk.syncPurposes.mockReset();
    sdk.syncPreferenceTopics.mockReset();
    sdk.syncPurposes.mockResolvedValue({ success: true, purposeIdByTrackingType: { Foo: 'id-1' } });
    sdk.syncPreferenceTopics.mockResolvedValue(true);
  });

  it('syncs purposes then nested topics tagged with the tracking type', async () => {
    const result = await tool('consent_write_purposes').handler({
      purposes: [
        {
          trackingType: 'Foo',
          name: 'Foo',
          title: 'Foo',
          'preference-topics': [
            { slug: 'News', type: 'BOOLEAN', title: 'News', description: 'News emails' },
          ],
        },
      ],
    } as never);
    expect(sdk.syncPurposes).toHaveBeenCalledOnce();
    expect(sdk.syncPreferenceTopics).toHaveBeenCalledWith(
      { marker: 'client' },
      [expect.objectContaining({ slug: 'News', 'tracking-type': 'Foo' })],
      expect.objectContaining({ purposeIdByTrackingType: { Foo: 'id-1' } }),
    );
    expect(parse(result).data).toMatchObject({
      success: true,
      errors: [],
      purposes: 1,
      preferenceTopics: 1,
    });
  });

  it('skips topics when none are nested', async () => {
    await tool('consent_write_purposes').handler({
      purposes: [{ trackingType: 'Foo', name: 'Foo', title: 'Foo' }],
    } as never);
    expect(sdk.syncPreferenceTopics).not.toHaveBeenCalled();
  });

  it('reports a failed purpose sync', async () => {
    sdk.syncPurposes.mockResolvedValue({ success: false, purposeIdByTrackingType: {} });
    const result = await tool('consent_write_purposes').handler({
      purposes: [{ trackingType: 'Foo', name: 'Foo', title: 'Foo' }],
    } as never);
    const { data } = parse(result);
    expect(data.success).toBe(false);
    expect(data.errors[0].resource).toBe('purposes');
  });

  it('rejects a purpose without a name', async () => {
    await expect(
      tool('consent_write_purposes').handler({
        purposes: [{ trackingType: 'Foo', title: 'Foo' }],
      } as never),
    ).rejects.toThrow(/items\[0\] is not valid/);
    expect(sdk.syncPurposes).not.toHaveBeenCalled();
  });
});
