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

  it('listRequestIdentifiers POSTs requestId with default pagination in the body', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ identifiers: [{ email: 'a@b.com' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new TranscendRestClient(TEST_AUTH, {
      baseUrl: 'https://sombra.example.com',
    });
    const identifiers = await client.listRequestIdentifiers('d6e2445a-32d2-4c35-9aa5-9e80cb8e3f89');

    expect(identifiers).toEqual([{ email: 'a@b.com' }]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://sombra.example.com/v1/request-identifiers');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      requestId: 'd6e2445a-32d2-4c35-9aa5-9e80cb8e3f89',
      first: 50,
      offset: 0,
    });
  });

  it('listRequestIdentifiers POSTs custom first and offset', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ identifiers: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new TranscendRestClient(TEST_AUTH, {
      baseUrl: 'https://sombra.example.com',
    });
    await client.listRequestIdentifiers('d6e2445a-32d2-4c35-9aa5-9e80cb8e3f89', {
      first: 10,
      offset: 20,
    });

    const [, init] = mockFetch.mock.calls[0]!;
    expect(JSON.parse(init.body)).toEqual({
      requestId: 'd6e2445a-32d2-4c35-9aa5-9e80cb8e3f89',
      first: 10,
      offset: 20,
    });
  });

  it('submitDSR POSTs bulk input with workflowConfigId and attestedAuthContext', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          requests: [
            {
              id: 'req-1',
              status: 'COMPILING',
              type: 'ACCESS',
              subjectType: 'customer',
              email: 'person@example.com',
              coreIdentifier: 'person@example.com',
              isSilent: true,
              isTest: false,
              link: 'https://app.transcend.io/privacy-requests/incoming-requests/req-1',
              attributeValues: [],
              workflowConfig: { id: 'wf-config-1' },
            },
          ],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new TranscendRestClient(TEST_AUTH, {
      baseUrl: 'https://sombra.example.com',
    });
    const result = await client.submitDSR({
      workflowConfigId: 'wf-config-1',
      email: 'person@example.com',
      isSilent: true,
      locale: 'en-US',
    });

    expect(result).toEqual([
      {
        id: 'req-1',
        status: 'COMPILING',
        type: 'ACCESS',
        subjectType: 'customer',
        link: 'https://app.transcend.io/privacy-requests/incoming-requests/req-1',
      },
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://sombra.example.com/v1/data-subject-request-bulk');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      input: [
        {
          workflowConfigId: 'wf-config-1',
          attestedAuthContext: {
            email: 'person@example.com',
            coreIdentifier: 'person@example.com',
          },
          locale: 'en-US',
          isSilent: true,
        },
      ],
    });
    expect(body).not.toHaveProperty('dhEncrypted');
    expect(body.input[0]).not.toHaveProperty('type');
    expect(body.input[0]).not.toHaveProperty('subjectType');
  });

  it('classifyText maps guesses response and sends model_type', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          guesses: [[{ name: 'EMAIL', category: 'Contact', confidence: 0.91 }]],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new TranscendRestClient(TEST_AUTH, {
      baseUrl: 'https://sombra.example.com',
    });
    const results = await client.classifyText({
      texts: ['a@b.com'],
      categories: ['EMAIL'],
      model: 'gpt-4',
    });

    expect(results).toEqual([
      {
        text: 'a@b.com',
        classifications: [{ category: 'EMAIL', confidence: 0.91, subcategory: 'Contact' }],
      },
    ]);
    const [, init] = mockFetch.mock.calls[0]!;
    expect(JSON.parse(init.body)).toEqual({
      inputList: ['a@b.com'],
      labels: ['EMAIL'],
      model_type: 'gpt-4',
    });
  });

  it('extractEntities maps guesses response to entities', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          guesses: [[{ value: 'a@b.com', type: 'Email', confidence: 0.88, snippet: 'a@b.com' }]],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new TranscendRestClient(TEST_AUTH, {
      baseUrl: 'https://sombra.example.com',
    });
    const result = await client.extractEntities({
      text: 'email a@b.com',
      entityTypes: ['Email'],
    });

    expect(result).toEqual({
      entities: [{ text: 'a@b.com', type: 'Email', confidence: 0.88, snippet: 'a@b.com' }],
    });
  });

  it('enrichIdentifiers sends nonce header and enrichedIdentifiers body', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new TranscendRestClient(TEST_AUTH, {
      baseUrl: 'https://sombra.example.com',
    });
    await client.enrichIdentifiers({
      nonce: 'test-nonce',
      identifiers: { email: 'User@Example.com' },
    });

    const [, init] = mockFetch.mock.calls[0]!;
    expect(init.method).toBe('POST');
    expect(init.headers['x-transcend-nonce']).toBe('test-nonce');
    expect(JSON.parse(init.body)).toEqual({
      enrichedIdentifiers: { email: [{ value: 'user@example.com' }] },
    });
  });

  it('respondToAccess POSTs /v1/data-silo with nonce header', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new TranscendRestClient(TEST_AUTH, {
      baseUrl: 'https://sombra.example.com',
    });
    await client.respondToAccess({
      nonce: 'access-nonce',
      profiles: [{ profileId: 'p1', profileData: { email: 'a@b.com' } }],
    });

    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://sombra.example.com/v1/data-silo');
    expect(init.method).toBe('POST');
    expect(init.headers['x-transcend-nonce']).toBe('access-nonce');
    expect(JSON.parse(init.body)).toEqual({
      profiles: [{ profileId: 'p1', profileData: { email: 'a@b.com' } }],
    });
  });

  it('confirmErasure PUTs /v1/data-silo with READY status', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new TranscendRestClient(TEST_AUTH, {
      baseUrl: 'https://sombra.example.com',
    });
    await client.confirmErasure({
      nonce: 'erasure-nonce',
      profileIds: ['profile-1'],
    });

    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://sombra.example.com/v1/data-silo');
    expect(init.method).toBe('PUT');
    expect(init.headers['x-transcend-nonce']).toBe('erasure-nonce');
    expect(JSON.parse(init.body)).toEqual({
      profiles: [{ profileId: 'profile-1' }],
      status: 'READY',
    });
  });

  it('queryPreferences sends filter/limit and parses nodes', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ nodes: [{ userId: 'u1' }], cursor: 'next' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new TranscendRestClient(TEST_AUTH, {
      baseUrl: 'https://sombra.example.com',
    });
    const result = await client.queryPreferences({
      partition: 'default',
      identifiers: [{ name: 'email', value: 'a@b.com' }],
    });

    expect(result).toEqual({ nodes: [{ userId: 'u1' }], cursor: 'next' });
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://sombra.example.com/v1/preferences/default/query');
    expect(JSON.parse(init.body)).toEqual({
      filter: { identifiers: [{ name: 'email', value: 'a@b.com' }] },
      limit: 1,
    });
  });
});
