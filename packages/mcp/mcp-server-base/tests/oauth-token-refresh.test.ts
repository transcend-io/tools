import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { refreshOAuthTokens } from '../src/oauth/token-refresh.js';
import { storedTokensFromTokenResponse } from '../src/oauth/token-store.js';

describe('refreshOAuthTokens', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('posts the refresh_token grant and preserves the prior refresh token when omitted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'new-access-token',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    globalThis.fetch = fetchMock;

    const previous = storedTokensFromTokenResponse({
      response: {
        access_token: 'old-access',
        refresh_token: 'refresh-token',
        expires_in: 60,
      },
      issuer: 'https://yo.com:4001',
      clientId: 'client-xyz',
      nowMs: 1_700_000_000_000,
    });

    const refreshed = await refreshOAuthTokens({
      tokenEndpoint: 'https://yo.com:4001/oauth/token',
      stored: previous,
    });

    expect(fetchMock).toHaveBeenCalledWith('https://yo.com:4001/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: 'refresh-token',
        client_id: 'client-xyz',
      }),
    });

    expect(refreshed.accessToken).toBe('new-access-token');
    expect(refreshed.refreshToken).toBe('refresh-token');
    expect(refreshed.clientId).toBe('client-xyz');
  });

  it('throws when the refresh token is missing', async () => {
    const stored = storedTokensFromTokenResponse({
      response: { access_token: 'access', expires_in: 3600 },
      issuer: 'https://yo.com:4001',
      clientId: 'client',
    });

    await expect(
      refreshOAuthTokens({
        tokenEndpoint: 'https://yo.com:4001/oauth/token',
        stored,
      }),
    ).rejects.toThrow(/requires a refresh token/i);
  });
});
