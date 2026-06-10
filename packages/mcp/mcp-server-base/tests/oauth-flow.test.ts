import { describe, expect, it } from 'vitest';

import { buildAuthorizationUrl } from '../src/oauth/oauth-flow.js';

describe('buildAuthorizationUrl', () => {
  it('includes PKCE, state, and scope parameters', () => {
    const url = new URL(
      buildAuthorizationUrl({
        authorizationEndpoint: 'https://yo.com:4001/oauth/authorize',
        clientId: 'client-123',
        redirectUri: 'http://127.0.0.1:4567/callback',
        codeChallenge: 'challenge-abc',
        state: 'state-xyz',
        scopes: ['offline_access', 'viewRequests'],
      }),
    );

    expect(url.origin + url.pathname).toBe('https://yo.com:4001/oauth/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('client-123');
    expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:4567/callback');
    expect(url.searchParams.get('code_challenge')).toBe('challenge-abc');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('state-xyz');
    expect(url.searchParams.get('scope')).toBe('offline_access viewRequests');
  });
});
