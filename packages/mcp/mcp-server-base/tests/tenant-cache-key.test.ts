import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { tenantCacheKey } from '../src/tenant-cache-key.js';

describe('tenantCacheKey', () => {
  it('returns anonymous when auth is null', () => {
    expect(tenantCacheKey(null)).toBe('anonymous');
  });

  it('keys session cookies by organization id only', () => {
    expect(
      tenantCacheKey({
        type: 'sessionCookie',
        cookie: 'laravel_session=user-a',
        organizationId: 'org-1',
      }),
    ).toBe('org:org-1');

    expect(
      tenantCacheKey({
        type: 'sessionCookie',
        cookie: 'laravel_session=user-b',
        organizationId: 'org-1',
      }),
    ).toBe('org:org-1');

    expect(
      tenantCacheKey({
        type: 'sessionCookie',
        cookie: 'laravel_session=user-a',
        organizationId: 'org-2',
      }),
    ).toBe('org:org-2');
  });

  it('keys api keys by a hash of the key material', () => {
    const key = 'sk-test-key';
    const expected = `apiKey:${createHash('sha256').update(key).digest('hex').slice(0, 32)}`;
    expect(tenantCacheKey({ type: 'apiKey', apiKey: key })).toBe(expected);
    expect(tenantCacheKey({ type: 'apiKey', apiKey: 'other' })).not.toBe(expected);
  });

  it('keys oauth by refresh token when present', () => {
    const refresh = 'refresh-token';
    const expected = `oauth:${createHash('sha256').update(refresh).digest('hex').slice(0, 32)}`;
    expect(
      tenantCacheKey({
        type: 'oauthToken',
        accessToken: 'access',
        refreshToken: refresh,
      }),
    ).toBe(expected);
  });
});
