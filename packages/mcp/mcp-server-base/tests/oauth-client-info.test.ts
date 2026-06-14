import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchOAuthClientInfo } from '../src/oauth/client-info.js';

describe('fetchOAuthClientInfo', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns client_id from a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ client_id: 'client-abc' }),
      }),
    );

    await expect(fetchOAuthClientInfo('https://yo.com:4001/', 'secret-value')).resolves.toBe(
      'client-abc',
    );

    expect(fetch).toHaveBeenCalledWith('https://yo.com:4001/oauth/client-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_secret: 'secret-value' }),
    });
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'invalid secret',
      }),
    );

    await expect(fetchOAuthClientInfo('https://yo.com:4001', 'bad-secret')).rejects.toThrow(
      /OAuth client-info exchange failed: HTTP 401 — invalid secret/,
    );
  });

  it('throws when client_id is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );

    await expect(fetchOAuthClientInfo('https://yo.com:4001', 'secret')).rejects.toThrow(
      /missing client_id/,
    );
  });
});
