import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { exchangeAuthorizationCode } from '../src/oauth/token-exchange.js';

describe('exchangeAuthorizationCode', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('posts the authorization code grant and returns stored tokens', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'offline_access viewAllActionItems',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    globalThis.fetch = fetchMock;

    const tokens = await exchangeAuthorizationCode({
      tokenEndpoint: 'https://yo.com:4001/oauth/token',
      issuer: 'https://yo.com:4001',
      grant: {
        code: 'auth-code',
        state: 'state-123',
        codeVerifier: 'verifier-abc',
        redirectUri: 'http://127.0.0.1:8765/callback',
        clientId: 'client-xyz',
      },
    });

    expect(fetchMock).toHaveBeenCalledWith('https://yo.com:4001/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'auth-code',
        redirect_uri: 'http://127.0.0.1:8765/callback',
        client_id: 'client-xyz',
        code_verifier: 'verifier-abc',
      }),
    });

    expect(tokens).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      scope: 'offline_access viewAllActionItems',
      issuer: 'https://yo.com:4001',
      clientId: 'client-xyz',
    });
  });

  it('throws when the token endpoint returns an error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('invalid_grant', { status: 400 }));

    await expect(
      exchangeAuthorizationCode({
        tokenEndpoint: 'https://yo.com:4001/oauth/token',
        issuer: 'https://yo.com:4001',
        grant: {
          code: 'bad-code',
          state: 'state',
          codeVerifier: 'verifier',
          redirectUri: 'http://127.0.0.1:1/callback',
          clientId: 'client',
        },
      }),
    ).rejects.toThrow(/OAuth token exchange failed/i);
  });
});
