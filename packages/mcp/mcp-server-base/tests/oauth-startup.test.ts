import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import * as clientInfo from '../src/oauth/client-info.js';
import { resetOAuthClientState } from '../src/oauth/client-registry.js';
import { ensureOAuthStartupReady } from '../src/oauth/startup.js';

describe('ensureOAuthStartupReady', () => {
  const logger = new SimpleLogger();
  const originalApiKey = process.env.TRANSCEND_API_KEY;
  const originalIssuer = process.env.TRANSCEND_OAUTH_ISSUER;
  const originalClientSecret = process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
  const originalRedirectPort = process.env.TRANSCEND_OAUTH_REDIRECT_PORT;

  beforeEach(() => {
    resetOAuthClientState();
    vi.restoreAllMocks();
    delete process.env.TRANSCEND_API_KEY;
    delete process.env.TRANSCEND_OAUTH_ISSUER;
    delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
  });

  afterEach(() => {
    resetOAuthClientState();
    if (originalApiKey === undefined) delete process.env.TRANSCEND_API_KEY;
    else process.env.TRANSCEND_API_KEY = originalApiKey;

    if (originalIssuer === undefined) delete process.env.TRANSCEND_OAUTH_ISSUER;
    else process.env.TRANSCEND_OAUTH_ISSUER = originalIssuer;

    if (originalClientSecret === undefined) delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    else process.env.TRANSCEND_OAUTH_CLIENT_SECRET = originalClientSecret;

    if (originalRedirectPort === undefined) delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
    else process.env.TRANSCEND_OAUTH_REDIRECT_PORT = originalRedirectPort;
  });

  it('no-ops when OAuth mode is disabled', async () => {
    const fetchSpy = vi.spyOn(clientInfo, 'fetchOAuthClientInfo');
    await ensureOAuthStartupReady(logger);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('exchanges the client secret at startup when OAuth mode is enabled', async () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';

    vi.spyOn(clientInfo, 'fetchOAuthClientInfo').mockResolvedValue('client-abc');

    await ensureOAuthStartupReady(logger);

    expect(clientInfo.fetchOAuthClientInfo).toHaveBeenCalledWith('https://yo.com:4001', 'secret');
  });

  it('throws when OAuth mode is enabled without a client secret', async () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';

    await expect(ensureOAuthStartupReady(logger)).rejects.toThrow(/TRANSCEND_OAUTH_CLIENT_SECRET/);
  });
});
