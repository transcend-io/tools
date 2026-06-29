import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_TRANSCEND_API_URL, DEFAULT_US_TRANSCEND_API_URL } from '../src/defaults.js';
import {
  resolveRegionalOAuthIssuer,
  verifyOAuthClientCredentials,
} from '../src/oauth/client-verify.js';
import { getOAuthClientsAdminUrl } from '../src/oauth/constants.js';

describe('verifyOAuthClientCredentials', () => {
  const originalDashboardUrl = process.env.TRANSCEND_DASHBOARD_URL;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.TRANSCEND_DASHBOARD_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalDashboardUrl === undefined) delete process.env.TRANSCEND_DASHBOARD_URL;
    else process.env.TRANSCEND_DASHBOARD_URL = originalDashboardUrl;
  });

  it('succeeds when the server returns isValid: true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ isValid: true }),
      }),
    );

    await expect(
      verifyOAuthClientCredentials(
        'https://yo.com:4001/',
        'client-abc',
        'secret-value',
        'http://127.0.0.1:4567/callback',
      ),
    ).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledWith('https://yo.com:4001/oauth/client-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: 'client-abc',
        client_secret: 'secret-value',
        redirect_uri: 'http://127.0.0.1:4567/callback',
      }),
    });
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'invalid credentials',
      }),
    );

    await expect(
      verifyOAuthClientCredentials(
        'https://yo.com:4001',
        'client-abc',
        'bad-secret',
        'http://127.0.0.1:4567/callback',
      ),
    ).rejects.toThrow(/OAuth client verification failed: HTTP 401 — invalid credentials/);
    await expect(
      verifyOAuthClientCredentials(
        'https://yo.com:4001',
        'client-abc',
        'bad-secret',
        'http://127.0.0.1:4567/callback',
      ),
    ).rejects.toThrow(getOAuthClientsAdminUrl());
  });

  it('throws when isValid is false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ isValid: false }),
      }),
    );

    await expect(
      verifyOAuthClientCredentials(
        'https://yo.com:4001',
        'client-abc',
        'secret',
        'http://127.0.0.1:4567/callback',
      ),
    ).rejects.toThrow(/credentials were rejected/);
    await expect(
      verifyOAuthClientCredentials(
        'https://yo.com:4001',
        'client-abc',
        'secret',
        'http://127.0.0.1:4567/callback',
      ),
    ).rejects.toThrow(getOAuthClientsAdminUrl());
  });

  it('throws when isValid is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );

    await expect(
      verifyOAuthClientCredentials(
        'https://yo.com:4001',
        'client-abc',
        'secret',
        'http://127.0.0.1:4567/callback',
      ),
    ).rejects.toThrow(/credentials were rejected/);
  });

  it('uses TRANSCEND_DASHBOARD_URL in error guidance in test env when set', async () => {
    process.env.TRANSCEND_DASHBOARD_URL = 'https://yo.com:3000';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'invalid credentials',
      }),
    );

    await expect(
      verifyOAuthClientCredentials(
        'https://yo.com:4001',
        'client-abc',
        'bad-secret',
        'http://127.0.0.1:4567/callback',
      ),
    ).rejects.toThrow('https://yo.com:3000/admin/oauth-clients');
  });
});

describe('resolveRegionalOAuthIssuer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns as soon as one issuer verifies successfully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.startsWith(`${DEFAULT_US_TRANSCEND_API_URL}/oauth/client-verify`)) {
          return new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ isValid: true }),
                }),
              50,
            );
          });
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({ isValid: true }),
        });
      }),
    );

    await expect(
      resolveRegionalOAuthIssuer(
        [DEFAULT_TRANSCEND_API_URL, DEFAULT_US_TRANSCEND_API_URL],
        'client-abc',
        'secret',
        'http://127.0.0.1:4567/callback',
      ),
    ).resolves.toBe(DEFAULT_TRANSCEND_API_URL);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledWith(`${DEFAULT_TRANSCEND_API_URL}/oauth/client-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: 'client-abc',
        client_secret: 'secret',
        redirect_uri: 'http://127.0.0.1:4567/callback',
      }),
    });
  });

  it('falls back to the next regional issuer when the first fails', async () => {
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

    await expect(
      resolveRegionalOAuthIssuer(
        [DEFAULT_TRANSCEND_API_URL, DEFAULT_US_TRANSCEND_API_URL],
        'client-abc',
        'secret',
        'http://127.0.0.1:4567/callback',
      ),
    ).resolves.toBe(DEFAULT_US_TRANSCEND_API_URL);

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('throws when all regional issuers fail verification', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'invalid credentials',
      }),
    );

    await expect(
      resolveRegionalOAuthIssuer(
        [DEFAULT_TRANSCEND_API_URL, DEFAULT_US_TRANSCEND_API_URL],
        'client-abc',
        'bad-secret',
        'http://127.0.0.1:4567/callback',
      ),
    ).rejects.toThrow(/all regional backends/i);
    await expect(
      resolveRegionalOAuthIssuer(
        [DEFAULT_TRANSCEND_API_URL, DEFAULT_US_TRANSCEND_API_URL],
        'client-abc',
        'bad-secret',
        'http://127.0.0.1:4567/callback',
      ),
    ).rejects.toThrow(getOAuthClientsAdminUrl());
  });
});
