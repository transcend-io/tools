import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import { initializeOAuthClient, resetOAuthClientState } from '../src/oauth/client-registry.js';
import * as clientVerify from '../src/oauth/client-verify.js';
import * as metadata from '../src/oauth/metadata.js';
import {
  buildAuthorizationUrl,
  startOAuthLogin,
  waitForAuthorizationGrant,
} from '../src/oauth/oauth-flow.js';
import { configureOAuthScopes, resetConfiguredOAuthScopes } from '../src/oauth/scopes.js';
import type { PendingOAuthSession } from '../src/oauth/types.js';
import { getAvailablePort } from './helpers/get-available-port.js';

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
      authorizationUrl: 'https://yo.com:4001/oauth/authorize?client_id=client-123',
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

describe('startOAuthLogin', () => {
  const ISSUER = 'https://issuer.example';
  const logger = new SimpleLogger();
  const originalEnv = { ...process.env };
  const sessions: PendingOAuthSession[] = [];

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    resetOAuthClientState();
    delete process.env.TRANSCEND_API_KEY;
    delete process.env.TRANSCEND_OAUTH_REDIRECT_HOST;
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = String(await getAvailablePort());
    configureOAuthScopes(['ViewRequests']);

    vi.spyOn(clientVerify, 'resolveRegionalOAuthIssuer').mockResolvedValue(ISSUER);
    vi.spyOn(metadata, 'fetchAuthorizationServerMetadata').mockResolvedValue({
      issuer: ISSUER,
      authorizationEndpoint: `${ISSUER}/oauth/authorize`,
      tokenEndpoint: `${ISSUER}/oauth/token`,
      codeChallengeMethodsSupported: ['S256'],
    });
    await initializeOAuthClient('client-abc', 'secret', logger);
  });

  afterEach(async () => {
    await Promise.all(sessions.splice(0).map((session) => session.close()));
    resetOAuthClientState();
    resetConfiguredOAuthScopes();
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('listens for the redirect of the consent URL it returns', async () => {
    const session = await startOAuthLogin({ issuer: ISSUER, logger });
    sessions.push(session);

    const consentUrl = new URL(session.authorizationUrl);
    expect(consentUrl.origin + consentUrl.pathname).toBe(`${ISSUER}/oauth/authorize`);
    expect(consentUrl.searchParams.get('redirect_uri')).toBe(session.redirectUri);

    const state = consentUrl.searchParams.get('state')!;
    const redirect = await fetch(`${session.redirectUri}?code=auth-code&state=${state}`);
    expect(redirect.status).toBe(200);

    await expect(waitForAuthorizationGrant(session)).resolves.toMatchObject({
      code: 'auth-code',
      state,
      codeVerifier: session.codeVerifier,
    });
  });

  it('rejects with EADDRINUSE while another login holds the callback port', async () => {
    sessions.push(await startOAuthLogin({ issuer: ISSUER, logger }));

    await expect(startOAuthLogin({ issuer: ISSUER, logger })).rejects.toMatchObject({
      code: 'EADDRINUSE',
    });
  });
});
