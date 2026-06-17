import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { verifyOAuthClientCredentials } from '../src/oauth/client-verify.js';
import { OAUTH_CLIENTS_ADMIN_URL } from '../src/oauth/constants.js';

describe('verifyOAuthClientCredentials', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('succeeds when the server returns success: true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
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
    ).rejects.toThrow(OAUTH_CLIENTS_ADMIN_URL);
  });

  it('throws when success is false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false }),
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
    ).rejects.toThrow(OAUTH_CLIENTS_ADMIN_URL);
  });

  it('throws when success is missing', async () => {
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
});
