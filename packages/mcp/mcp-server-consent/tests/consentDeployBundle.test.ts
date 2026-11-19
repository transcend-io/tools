import { DEPLOY_CONSENT_MANAGER } from '@transcend-io/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetAirgapBundleIdCacheForTests } from '../src/resolveAirgapBundleId.js';
import { getConsentTools } from '../src/tools/index.js';

describe('consent_deploy_bundle', () => {
  let mockGraphql: {
    makeRequest: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    resetAirgapBundleIdCacheForTests();
    mockGraphql = {
      makeRequest: vi.fn(),
    };
    mockGraphql.makeRequest
      .mockResolvedValueOnce({ consentManager: { consentManager: { id: 'bundle-1' } } })
      .mockResolvedValueOnce({});
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

      expect(mockGraphql.makeRequest).toHaveBeenCalledTimes(2);
      expect(mockGraphql.makeRequest).toHaveBeenLastCalledWith(DEPLOY_CONSENT_MANAGER, {
        airgapBundleId: 'bundle-1',
        bundleType: environment,
      });
      expect(result).toMatchObject({
        success: true,
        data: { deployed: true, environment, airgapBundleId: 'bundle-1' },
      });
    },
  );

  it('does not report success when the deploy fails', async () => {
    mockGraphql.makeRequest.mockReset();
    mockGraphql.makeRequest
      .mockResolvedValueOnce({ consentManager: { consentManager: { id: 'bundle-1' } } })
      .mockRejectedValueOnce(new Error('boom'));

    const tool = getTool();
    await expect(tool.handler(tool.zodSchema.parse({ environment: 'PRODUCTION' }))).rejects.toThrow(
      'boom',
    );
  });
});
