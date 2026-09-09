import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { requestAuthContext } from '../src/auth-context.js';
import { STDIO_TENANT_CACHE_KEY, tenantCacheKey } from '../src/tenant-cache-key.js';

describe('tenantCacheKey', () => {
  it('returns a stable stdio key when no per-request auth is set', () => {
    expect(tenantCacheKey()).toBe(STDIO_TENANT_CACHE_KEY);
  });

  it('keys session cookies by organization id only under HTTP ALS', async () => {
    await requestAuthContext.run(
      { type: 'sessionCookie', cookie: 'laravel_session=user-a', organizationId: 'org-1' },
      () => {
        expect(tenantCacheKey()).toBe('org:org-1');
      },
    );

    await requestAuthContext.run(
      { type: 'sessionCookie', cookie: 'laravel_session=user-b', organizationId: 'org-1' },
      () => {
        expect(tenantCacheKey()).toBe('org:org-1');
      },
    );

    await requestAuthContext.run(
      { type: 'sessionCookie', cookie: 'laravel_session=user-a', organizationId: 'org-2' },
      () => {
        expect(tenantCacheKey()).toBe('org:org-2');
      },
    );
  });

  it('keys api keys by a hash of the key material under HTTP ALS', async () => {
    const key = 'sk-test-key';
    const expected = `apiKey:${createHash('sha256').update(key).digest('hex').slice(0, 32)}`;

    await requestAuthContext.run({ type: 'apiKey', apiKey: key }, () => {
      expect(tenantCacheKey()).toBe(expected);
    });

    await requestAuthContext.run({ type: 'apiKey', apiKey: 'other' }, () => {
      expect(tenantCacheKey()).not.toBe(expected);
    });
  });

  it('keys oauth by refresh token when present under HTTP ALS', async () => {
    const refresh = 'refresh-token';
    const expected = `oauth:${createHash('sha256').update(refresh).digest('hex').slice(0, 32)}`;

    await requestAuthContext.run(
      { type: 'oauthToken', accessToken: 'access', refreshToken: refresh },
      () => {
        expect(tenantCacheKey()).toBe(expected);
      },
    );
  });
});
