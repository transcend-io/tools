import { describe, expect, it } from 'vitest';

import {
  computeOAuthExpiresAt,
  isStoredOAuthTokenValid,
  storedOAuthTokensToAuth,
  storedTokensFromRefreshResponse,
  storedTokensFromTokenResponse,
} from '../src/oauth/token-store.js';

describe('token helpers', () => {
  it('preserves the prior refresh token when the refresh response omits one', () => {
    const previous = storedTokensFromTokenResponse({
      response: {
        access_token: 'old-access',
        refresh_token: 'refresh-token',
        expires_in: 60,
      },
      issuer: 'https://yo.com:4001',
      clientId: 'client-abc',
      nowMs: 1_700_000_000_000,
    });

    const refreshed = storedTokensFromRefreshResponse({
      response: { access_token: 'new-access', expires_in: 3600 },
      previous,
      nowMs: 1_700_000_100_000,
    });

    expect(refreshed.accessToken).toBe('new-access');
    expect(refreshed.refreshToken).toBe('refresh-token');
  });

  it('computes expiresAt with a 60-second skew buffer', () => {
    const now = 1_700_000_000_000;
    expect(computeOAuthExpiresAt(3600, now)).toBe(now + (3600 - 60) * 1000);
  });

  it('converts stored tokens to auth credentials', () => {
    const tokens = storedTokensFromTokenResponse({
      response: {
        access_token: 'access-123',
        refresh_token: 'refresh-456',
        expires_in: 3600,
        scope: 'offline_access viewAllActionItems',
      },
      issuer: 'https://yo.com:4001/',
      clientId: 'client-abc',
      nowMs: 1_700_000_000_000,
    });

    expect(storedOAuthTokensToAuth(tokens)).toEqual({
      type: 'oauthToken',
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      expiresAt: 1_700_000_000_000 + (3600 - 60) * 1000,
    });
    expect(tokens.issuer).toBe('https://yo.com:4001');
  });

  it('validates token expiry with skew', () => {
    const valid = storedTokensFromTokenResponse({
      response: { access_token: 'access-123', expires_in: 3600 },
      issuer: 'https://yo.com:4001',
      clientId: 'client-abc',
      nowMs: 1_700_000_000_000,
    });
    expect(isStoredOAuthTokenValid(valid, 1_700_000_000_000)).toBe(true);

    const expired = storedTokensFromTokenResponse({
      response: { access_token: 'expired', expires_in: 60 },
      issuer: 'https://yo.com:4001',
      clientId: 'client-abc',
      nowMs: 1_700_000_000_000,
    });
    expect(isStoredOAuthTokenValid(expired, expired.expiresAt + 1)).toBe(false);
  });
});
