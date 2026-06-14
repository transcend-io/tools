import { describe, expect, it } from 'vitest';

import { buildAuthorizationUrl, waitForAuthorizationGrant } from '../src/oauth/oauth-flow.js';

describe('buildAuthorizationUrl', () => {
  it('includes PKCE, state, and scope parameters', () => {
    const authorizationUrl = buildAuthorizationUrl({
      authorizationEndpoint: 'https://yo.com:4001/oauth/authorize',
      clientId: 'client-123',
      redirectUri: 'http://127.0.0.1:4567/callback',
      codeChallenge: 'challenge-abc',
      state: 'state-xyz',
      scopes: ['offline_access', 'viewRequests'],
    });
    const url = new URL(authorizationUrl);

    expect(url.origin + url.pathname).toBe('https://yo.com:4001/oauth/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('client-123');
    expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:4567/callback');
    expect(url.searchParams.get('code_challenge')).toBe('challenge-abc');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('state-xyz');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('scope')).toBe('offline_access viewRequests');
    expect(authorizationUrl).toContain('scope=offline_access%20viewRequests');
    expect(authorizationUrl).not.toContain('scope=offline_access+viewRequests');
  });
});

describe('waitForAuthorizationGrant', () => {
  it('merges callback result with session fields for token exchange', async () => {
    const grant = await waitForAuthorizationGrant({
      redirectUri: 'http://127.0.0.1:4567/callback',
      clientId: 'client-123',
      codeVerifier: 'verifier-abc',
      waitForCallback: async () => ({ code: 'auth-code', state: 'state-xyz' }),
      close: async () => undefined,
    });

    expect(grant).toEqual({
      code: 'auth-code',
      state: 'state-xyz',
      codeVerifier: 'verifier-abc',
      redirectUri: 'http://127.0.0.1:4567/callback',
      clientId: 'client-123',
    });
  });
});
