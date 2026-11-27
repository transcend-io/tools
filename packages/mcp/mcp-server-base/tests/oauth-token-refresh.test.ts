import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OAuthGrantType } from '../src/oauth/constants.js';
import { refreshOAuthTokens } from '../src/oauth/token-refresh.js';
import { OAuthTokenRequestError } from '../src/oauth/token-request.js';
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
      clientSecret: 'client-secret',
    });

    expect(fetchMock).toHaveBeenCalledWith('https://yo.com:4001/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: OAuthGrantType.RefreshToken,
        refresh_token: 'refresh-token',
        client_id: 'client-xyz',
        client_secret: 'client-secret',
      }),
      signal: expect.any(AbortSignal),
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
        clientSecret: 'client-secret',
      }),
    ).rejects.toThrow(/requires a refresh token/i);
  });

  it.each([
    {
      answer: 'an OAuth error body',
      status: 400,
      body: JSON.stringify({ error: 'invalid_grant', error_description: 'grant is revoked' }),
      oauthError: 'invalid_grant',
    },
    { answer: 'a body that is not JSON', status: 502, body: 'Bad Gateway', oauthError: undefined },
  ])(
    'raises a typed error with the status and OAuth error code for $answer',
    async ({ status, body, oauthError }) => {
      const stored = storedTokensFromTokenResponse({
        response: { access_token: 'access', refresh_token: 'refresh-token', expires_in: 60 },
        issuer: 'https://yo.com:4001',
        clientId: 'client-xyz',
      });

      const error: unknown = await refreshOAuthTokens({
        tokenEndpoint: 'https://yo.com:4001/oauth/token',
        stored,
        clientSecret: 'client-secret',
        fetch: async () => new Response(body, { status }),
      }).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(OAuthTokenRequestError);
      expect(error).toMatchObject({
        status,
        oauthError,
        message: `OAuth token refresh failed: HTTP ${status} — ${body}`,
      });
    },
  );
});
