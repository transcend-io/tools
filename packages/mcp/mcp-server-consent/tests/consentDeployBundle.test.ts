import { deployConsentManager } from '@transcend-io/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetAirgapBundleIdCacheForTests } from '../src/resolveAirgapBundleId.js';
import { getConsentTools } from '../src/tools/index.js';

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  deployConsentManager: vi.fn(),
}));

const deployMock = vi.mocked(deployConsentManager);

describe('consent_deploy_bundle', () => {
  let mockGraphql: {
    makeRequest: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    resetAirgapBundleIdCacheForTests();
    deployMock.mockReset();
    deployMock.mockResolvedValue(undefined);
    mockGraphql = {
      makeRequest: vi
        .fn()
        .mockResolvedValue({ consentManager: { consentManager: { id: 'bundle-1' } } }),
    };
  });

  const getTool = () =>
    getConsentTools({
      rest: {} as never,
      graphql: mockGraphql as never,
      dashboardUrl: 'https://app.transcend.io',
    }).find((t) => t.name === 'consent_deploy_bundle')!;

  it('is registered', () => {
    expect(getTool()).toBeDefined();
  });

  it('is a confirmation-gated, destructive, non-read-only write', () => {
    const tool = getTool();
    expect(tool.readOnly).toBe(false);
    expect(tool.confirmation?.hint.trim()).not.toBe('');
    expect(tool.confirmation?.hint).toContain('environment');
    expect(tool.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
    });
  });

  describe('input validation', () => {
    it.each([['TEST'], ['PRODUCTION']])('accepts environment %s', (environment) => {
      expect(getTool().zodSchema.safeParse({ environment }).success).toBe(true);
    });

    it('requires environment', () => {
      const result = getTool().zodSchema.safeParse({});
      expect(result.success).toBe(false);
      expect((result as any).error.issues.map((i: any) => i.path[0])).toContain('environment');
    });

    it.each([['staging'], ['test'], ['production'], [''], [undefined], [null], [1]])(
      'rejects environment %s',
      (environment) => {
        expect(getTool().zodSchema.safeParse({ environment }).success).toBe(false);
      },
    );
  });

  it.each([['TEST'], ['PRODUCTION']])(
    'deploys the %s bundle for the resolved consent manager',
    async (environment) => {
      const tool = getTool();
      const result = await tool.handler(tool.zodSchema.parse({ environment }));

      expect(deployMock).toHaveBeenCalledTimes(1);
      expect(deployMock).toHaveBeenCalledWith(expect.anything(), {
        id: 'bundle-1',
        bundleType: environment,
      });
      expect(result).toMatchObject({
        success: true,
        data: { deployed: true, environment, airgapBundleId: 'bundle-1' },
      });
    },
  );

  it('routes the SDK request through the MCP GraphQL client without stacking retries', async () => {
    deployMock.mockImplementation(async (client) => {
      await client.request('mutation Deploy { ok }', { airgapBundleId: 'bundle-1' });
    });
    mockGraphql.makeRequest.mockClear();

    const tool = getTool();
    await tool.handler(tool.zodSchema.parse({ environment: 'TEST' }));

    expect(mockGraphql.makeRequest).toHaveBeenLastCalledWith(
      'mutation Deploy { ok }',
      { airgapBundleId: 'bundle-1' },
      { retries: 0 },
    );
  });

  it('does not report success when the deploy fails', async () => {
    deployMock.mockRejectedValue(new Error('boom'));

    const tool = getTool();
    await expect(tool.handler(tool.zodSchema.parse({ environment: 'PRODUCTION' }))).rejects.toThrow(
      'boom',
    );
  });
});
