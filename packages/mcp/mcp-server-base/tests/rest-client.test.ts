import { afterEach, describe, expect, it, vi } from 'vitest';

import { TranscendRestClient } from '../src/clients/rest-client.js';
import { SOMBRA_AUTHORIZATION_HEADER } from '../src/http-header-names.js';

const TEST_AUTH = { type: 'apiKey' as const, apiKey: 'transcend-api-key' };

describe('TranscendRestClient Sombra host and headers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses sticky baseUrl and sends Transcend Authorization without X-Sombra-Authorization', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ key: 'pk' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new TranscendRestClient(TEST_AUTH, {
      baseUrl: 'https://sombra.example.com/',
    });
    await client.getSombraPublicKey();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://sombra.example.com/public-keys/sombra-general-signing-key');
    expect(init.headers.Authorization).toBe('Bearer transcend-api-key');
    expect(init.headers[SOMBRA_AUTHORIZATION_HEADER]).toBeUndefined();
  });

  it('sends X-Sombra-Authorization when sombraCustomerKey is set', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ key: 'pk' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new TranscendRestClient(TEST_AUTH, {
      baseUrl: 'https://sombra.example.com',
      sombraCustomerKey: 'sombra-customer-key',
    });
    await client.getSombraPublicKey();

    const [, init] = mockFetch.mock.calls[0]!;
    expect(init.headers.Authorization).toBe('Bearer transcend-api-key');
    expect(init.headers[SOMBRA_AUTHORIZATION_HEADER]).toBe('Bearer sombra-customer-key');
  });

  it('lazy-resolves baseUrl once via resolveBaseUrl', async () => {
    const resolveBaseUrl = vi.fn().mockResolvedValue('https://resolved.sombra.example.com/');
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ key: 'pk' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new TranscendRestClient(TEST_AUTH, { resolveBaseUrl });
    await client.getSombraPublicKey();
    await client.getSombraPublicKey();

    expect(resolveBaseUrl).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]![0]).toBe(
      'https://resolved.sombra.example.com/public-keys/sombra-general-signing-key',
    );
    expect(mockFetch.mock.calls[1]![0]).toBe(
      'https://resolved.sombra.example.com/public-keys/sombra-general-signing-key',
    );
    expect(client.getBaseUrl()).toBe('https://resolved.sombra.example.com');
  });

  it('re-runs assertReady on every Sombra call while keeping host sticky', async () => {
    const resolveBaseUrl = vi.fn().mockResolvedValue('https://resolved.sombra.example.com');
    const assertReady = vi.fn().mockResolvedValue(undefined);
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ key: 'pk' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new TranscendRestClient(TEST_AUTH, { resolveBaseUrl, assertReady });
    await client.getSombraPublicKey();
    await client.getSombraPublicKey();

    expect(assertReady).toHaveBeenCalledTimes(2);
    expect(resolveBaseUrl).toHaveBeenCalledTimes(1);
  });

  it('blocks the Sombra call when assertReady rejects', async () => {
    const resolveBaseUrl = vi.fn().mockResolvedValue('https://resolved.sombra.example.com');
    const assertReady = vi.fn().mockRejectedValue(new Error('MCP × Sombra is disabled'));
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const client = new TranscendRestClient(TEST_AUTH, { resolveBaseUrl, assertReady });
    await expect(client.getSombraPublicKey()).rejects.toThrow(/MCP × Sombra is disabled/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('string constructor remains sticky without resolve', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ key: 'pk' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new TranscendRestClient(TEST_AUTH, 'http://localhost:9');
    await client.getSombraPublicKey();
    expect(mockFetch.mock.calls[0]![0]).toBe(
      'http://localhost:9/public-keys/sombra-general-signing-key',
    );
  });
});
