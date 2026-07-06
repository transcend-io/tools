import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import { DEFAULT_TRANSCEND_API_URL, DEFAULT_US_TRANSCEND_API_URL } from '../src/defaults.js';
import { resetOAuthClientState } from '../src/oauth/client-registry.js';
import { resolveMcpGraphqlUrl } from '../src/server/resolve-graphql-url.js';

describe('resolveMcpGraphqlUrl', () => {
  const originalApiKey = process.env.TRANSCEND_API_KEY;
  const originalClientId = process.env.TRANSCEND_OAUTH_CLIENT_ID;
  const originalClientSecret = process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
  const originalRedirectPort = process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
  const originalApiUrl = process.env.TRANSCEND_API_URL;
  const originalIssuer = process.env.TRANSCEND_OAUTH_ISSUER;

  beforeEach(() => {
    resetOAuthClientState();
    vi.restoreAllMocks();
    delete process.env.TRANSCEND_API_KEY;
    delete process.env.TRANSCEND_OAUTH_CLIENT_ID;
    delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
    delete process.env.TRANSCEND_API_URL;
    delete process.env.TRANSCEND_OAUTH_ISSUER;
  });

  afterEach(() => {
    resetOAuthClientState();
    vi.unstubAllGlobals();

    if (originalApiKey === undefined) delete process.env.TRANSCEND_API_KEY;
    else process.env.TRANSCEND_API_KEY = originalApiKey;

    if (originalClientId === undefined) delete process.env.TRANSCEND_OAUTH_CLIENT_ID;
    else process.env.TRANSCEND_OAUTH_CLIENT_ID = originalClientId;

    if (originalClientSecret === undefined) delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    else process.env.TRANSCEND_OAUTH_CLIENT_SECRET = originalClientSecret;

    if (originalRedirectPort === undefined) delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
    else process.env.TRANSCEND_OAUTH_REDIRECT_PORT = originalRedirectPort;

    if (originalApiUrl === undefined) delete process.env.TRANSCEND_API_URL;
    else process.env.TRANSCEND_API_URL = originalApiUrl;

    if (originalIssuer === undefined) delete process.env.TRANSCEND_OAUTH_ISSUER;
    else process.env.TRANSCEND_OAUTH_ISSUER = originalIssuer;
  });

  it('uses TRANSCEND_API_URL when OAuth mode is disabled', async () => {
    process.env.TRANSCEND_API_KEY = 'api-key';
    process.env.TRANSCEND_API_URL = 'https://api.us.transcend.io';

    await expect(resolveMcpGraphqlUrl(new SimpleLogger())).resolves.toBe(
      'https://api.us.transcend.io',
    );
  });

  it('defaults to EU API URL when OAuth mode is disabled and env is unset', async () => {
    process.env.TRANSCEND_API_KEY = 'api-key';

    await expect(resolveMcpGraphqlUrl(new SimpleLogger())).resolves.toBe(DEFAULT_TRANSCEND_API_URL);
  });

  it('uses the resolved backend URL in OAuth mode', async () => {
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';
    process.env.TRANSCEND_API_URL = 'https://api.transcend.io';

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'invalid credentials',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isValid: true }),
        }),
    );

    await expect(resolveMcpGraphqlUrl(new SimpleLogger())).resolves.toBe(
      DEFAULT_US_TRANSCEND_API_URL,
    );
  });

  it('ignores TRANSCEND_API_URL in OAuth mode after regional verification', async () => {
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';
    process.env.TRANSCEND_OAUTH_ISSUER = DEFAULT_US_TRANSCEND_API_URL;
    process.env.TRANSCEND_API_URL = DEFAULT_TRANSCEND_API_URL;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ isValid: true }),
      }),
    );

    await expect(resolveMcpGraphqlUrl(new SimpleLogger())).resolves.toBe(
      DEFAULT_US_TRANSCEND_API_URL,
    );
  });

  it('skips OAuth startup when requireStartupAuth is false even with OAuth env vars set', async () => {
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ isValid: true }),
      }),
    );

    await expect(
      resolveMcpGraphqlUrl(new SimpleLogger(), { requireStartupAuth: false }),
    ).resolves.toBe(DEFAULT_TRANSCEND_API_URL);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('deduplicates regional client verification across concurrent resolvers', async () => {
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';
    process.env.TRANSCEND_OAUTH_ISSUER = DEFAULT_US_TRANSCEND_API_URL;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ isValid: true }),
      }),
    );

    const logger = new SimpleLogger();
    const [first, second] = await Promise.all([
      resolveMcpGraphqlUrl(logger),
      resolveMcpGraphqlUrl(logger),
    ]);

    expect(first).toBe(DEFAULT_US_TRANSCEND_API_URL);
    expect(second).toBe(DEFAULT_US_TRANSCEND_API_URL);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
