import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import { resetOAuthClientState } from '../src/oauth/client-registry.js';
import * as clientVerify from '../src/oauth/client-verify.js';
import { buildOAuthClientsAdminUrl, formatOAuthClientConfigError } from '../src/oauth/constants.js';
import { ensureOAuthStartupReady } from '../src/oauth/startup.js';

describe('ensureOAuthStartupReady', () => {
  const logger = new SimpleLogger();
  const originalApiKey = process.env.TRANSCEND_API_KEY;
  const originalIssuer = process.env.TRANSCEND_OAUTH_ISSUER;
  const originalClientId = process.env.TRANSCEND_OAUTH_CLIENT_ID;
  const originalClientSecret = process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
  const originalRedirectPort = process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
  const originalRedirectHost = process.env.TRANSCEND_OAUTH_REDIRECT_HOST;

  beforeEach(() => {
    resetOAuthClientState();
    vi.restoreAllMocks();
    delete process.env.TRANSCEND_API_KEY;
    delete process.env.TRANSCEND_OAUTH_ISSUER;
    delete process.env.TRANSCEND_OAUTH_CLIENT_ID;
    delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
    delete process.env.TRANSCEND_OAUTH_REDIRECT_HOST;
  });

  afterEach(() => {
    resetOAuthClientState();
    if (originalApiKey === undefined) delete process.env.TRANSCEND_API_KEY;
    else process.env.TRANSCEND_API_KEY = originalApiKey;

    if (originalIssuer === undefined) delete process.env.TRANSCEND_OAUTH_ISSUER;
    else process.env.TRANSCEND_OAUTH_ISSUER = originalIssuer;

    if (originalClientId === undefined) delete process.env.TRANSCEND_OAUTH_CLIENT_ID;
    else process.env.TRANSCEND_OAUTH_CLIENT_ID = originalClientId;

    if (originalClientSecret === undefined) delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    else process.env.TRANSCEND_OAUTH_CLIENT_SECRET = originalClientSecret;

    if (originalRedirectPort === undefined) delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
    else process.env.TRANSCEND_OAUTH_REDIRECT_PORT = originalRedirectPort;

    if (originalRedirectHost === undefined) delete process.env.TRANSCEND_OAUTH_REDIRECT_HOST;
    else process.env.TRANSCEND_OAUTH_REDIRECT_HOST = originalRedirectHost;
  });

  it('no-ops when OAuth mode is disabled', async () => {
    const verifySpy = vi.spyOn(clientVerify, 'verifyOAuthClientCredentials');
    await ensureOAuthStartupReady(logger);
    expect(verifySpy).not.toHaveBeenCalled();
  });

  it('skips OAuth verification when TRANSCEND_API_KEY is set', async () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_API_KEY = 'test-api-key';
    const verifySpy = vi.spyOn(clientVerify, 'verifyOAuthClientCredentials');

    await ensureOAuthStartupReady(logger);

    expect(verifySpy).not.toHaveBeenCalled();
  });

  it('verifies client credentials at startup when OAuth mode is enabled', async () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';

    vi.spyOn(clientVerify, 'verifyOAuthClientCredentials').mockResolvedValue(undefined);

    await ensureOAuthStartupReady(logger);

    expect(clientVerify.verifyOAuthClientCredentials).toHaveBeenCalledWith(
      'https://yo.com:4001',
      'client-abc',
      'secret',
      'http://127.0.0.1:4567/callback',
    );
  });

  it('verifies client credentials with IPv6 redirect URI when host is ::1', async () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';
    process.env.TRANSCEND_OAUTH_REDIRECT_HOST = '::1';

    vi.spyOn(clientVerify, 'verifyOAuthClientCredentials').mockResolvedValue(undefined);

    await ensureOAuthStartupReady(logger);

    expect(clientVerify.verifyOAuthClientCredentials).toHaveBeenCalledWith(
      'https://yo.com:4001',
      'client-abc',
      'secret',
      'http://[::1]:4567/callback',
    );
  });

  it('throws when OAuth mode is enabled without a client id', async () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';

    await expect(ensureOAuthStartupReady(logger)).rejects.toThrow(/TRANSCEND_OAUTH_CLIENT_ID/);
  });

  it('throws when OAuth mode is enabled without a client secret', async () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';

    await expect(ensureOAuthStartupReady(logger)).rejects.toThrow(/TRANSCEND_OAUTH_CLIENT_SECRET/);
  });

  it('throws with admin URL when client verification fails', async () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';

    vi.spyOn(clientVerify, 'verifyOAuthClientCredentials').mockRejectedValue(
      new Error(formatOAuthClientConfigError('OAuth client verification failed: HTTP 401')),
    );

    await expect(ensureOAuthStartupReady(logger)).rejects.toThrow(buildOAuthClientsAdminUrl());
  });
});
