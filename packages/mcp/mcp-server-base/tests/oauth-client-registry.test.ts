import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import { DEFAULT_US_TRANSCEND_API_URL } from '../src/defaults.js';
import {
  getOAuthClientId,
  initializeOAuthClient,
  resetOAuthClientState,
} from '../src/oauth/client-registry.js';
import { getOAuthIssuer, getResolvedTranscendApiUrl } from '../src/oauth/config.js';

describe('initializeOAuthClient', () => {
  const originalClientId = process.env.TRANSCEND_OAUTH_CLIENT_ID;
  const originalClientSecret = process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
  const originalRedirectPort = process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
  const originalIssuer = process.env.TRANSCEND_OAUTH_ISSUER;

  beforeEach(() => {
    resetOAuthClientState();
    delete process.env.TRANSCEND_OAUTH_ISSUER;
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetOAuthClientState();
    vi.unstubAllGlobals();

    if (originalClientId === undefined) delete process.env.TRANSCEND_OAUTH_CLIENT_ID;
    else process.env.TRANSCEND_OAUTH_CLIENT_ID = originalClientId;

    if (originalClientSecret === undefined) delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    else process.env.TRANSCEND_OAUTH_CLIENT_SECRET = originalClientSecret;

    if (originalRedirectPort === undefined) delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
    else process.env.TRANSCEND_OAUTH_REDIRECT_PORT = originalRedirectPort;

    if (originalIssuer === undefined) delete process.env.TRANSCEND_OAUTH_ISSUER;
    else process.env.TRANSCEND_OAUTH_ISSUER = originalIssuer;
  });

  it('caches the resolved regional issuer after successful verification', async () => {
    process.env.TRANSCEND_OAUTH_ISSUER = DEFAULT_US_TRANSCEND_API_URL;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ isValid: true }),
      }),
    );

    await initializeOAuthClient('client-abc', 'secret', new SimpleLogger());

    expect(getOAuthIssuer()).toBe(DEFAULT_US_TRANSCEND_API_URL);
    expect(getResolvedTranscendApiUrl()).toBe(DEFAULT_US_TRANSCEND_API_URL);
  });

  it('clears cached client, issuer, and backend URL when client state is reset', async () => {
    process.env.TRANSCEND_OAUTH_ISSUER = DEFAULT_US_TRANSCEND_API_URL;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ isValid: true }),
      }),
    );

    await initializeOAuthClient('client-abc', 'secret', new SimpleLogger());
    resetOAuthClientState();
    delete process.env.TRANSCEND_OAUTH_ISSUER;

    expect(() => getOAuthClientId()).toThrow(/not initialized/i);
    expect(() => getResolvedTranscendApiUrl()).toThrow(/not resolved/i);
    expect(() => getOAuthIssuer()).toThrow(/not resolved/i);
  });

  it('throws when backend URL is read before client verification', () => {
    expect(() => getResolvedTranscendApiUrl()).toThrow(/not resolved/i);
  });
});
