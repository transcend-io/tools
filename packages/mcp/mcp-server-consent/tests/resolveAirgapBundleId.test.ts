import { requestAuthContext } from '@transcend-io/mcp-server-base';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  resetAirgapBundleIdCacheForTests,
  resolveAirgapBundleId,
} from '../src/resolveAirgapBundleId.js';

describe('resolveAirgapBundleId', () => {
  afterEach(() => {
    resetAirgapBundleIdCacheForTests();
    vi.restoreAllMocks();
  });

  it('reuses the stdio cache after oauth access token refresh', async () => {
    const makeRequest = vi
      .fn()
      .mockResolvedValue({ consentManager: { consentManager: { id: 'bundle-stdio' } } });
    const graphql = { makeRequest };

    const first = await resolveAirgapBundleId(graphql as never);
    // Simulate OAuth refresh mutating constructor auth on the client.
    const second = await resolveAirgapBundleId(graphql as never);

    expect(first).toBe('bundle-stdio');
    expect(second).toBe('bundle-stdio');
    expect(makeRequest).toHaveBeenCalledTimes(1);
  });

  it('caches by organization id across users in the same org under HTTP ALS', async () => {
    const makeRequest = vi
      .fn()
      .mockResolvedValue({ consentManager: { consentManager: { id: 'bundle-org-a' } } });
    const graphql = { makeRequest };

    const first = await requestAuthContext.run(
      { type: 'sessionCookie', cookie: 'user-1', organizationId: 'org-a' },
      () => resolveAirgapBundleId(graphql as never),
    );
    const second = await requestAuthContext.run(
      { type: 'sessionCookie', cookie: 'user-2', organizationId: 'org-a' },
      () => resolveAirgapBundleId(graphql as never),
    );

    expect(first).toBe('bundle-org-a');
    expect(second).toBe('bundle-org-a');
    expect(makeRequest).toHaveBeenCalledTimes(1);
  });

  it('does not reuse a bundle id across organizations on the same client', async () => {
    const makeRequest = vi.fn().mockImplementation(async () => {
      const auth = requestAuthContext.getStore();
      const org = auth?.type === 'sessionCookie' ? auth.organizationId : 'unknown';
      return { consentManager: { consentManager: { id: `bundle-${org}` } } };
    });
    const graphql = { makeRequest };

    const a = await requestAuthContext.run(
      { type: 'sessionCookie', cookie: 'user-1', organizationId: 'org-a' },
      () => resolveAirgapBundleId(graphql as never),
    );
    const b = await requestAuthContext.run(
      { type: 'sessionCookie', cookie: 'user-1', organizationId: 'org-b' },
      () => resolveAirgapBundleId(graphql as never),
    );

    expect(a).toBe('bundle-org-a');
    expect(b).toBe('bundle-org-b');
    expect(makeRequest).toHaveBeenCalledTimes(2);
  });
});
