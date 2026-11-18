import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestAuthContext } from '../src/auth-context.js';
import { TranscendGraphQLBase } from '../src/clients/graphql/base.js';
import { createGraphqlRequestClient } from '../src/clients/graphql/graphql-request-client.js';
import { ErrorCode, ToolError } from '../src/errors.js';
import { TRANSCEND_ACTIVE_ORG_ID_HEADER } from '../src/http-header-names.js';

const BASE_URL = 'https://api.example.test';

describe('createGraphqlRequestClient', () => {
  it('uses the base url and bearer auth', () => {
    const base = new TranscendGraphQLBase({ type: 'apiKey', apiKey: 'key-1' }, BASE_URL);
    const client = createGraphqlRequestClient(base);

    expect(client.requestConfig.headers).toMatchObject({ Authorization: 'Bearer key-1' });
    expect(base.getBaseUrl()).toBe(BASE_URL);
  });

  it('forwards the session cookie and organization id from request auth', () => {
    const base = new TranscendGraphQLBase(null, BASE_URL);

    const headers = requestAuthContext.run(
      { type: 'sessionCookie', cookie: 'sid=abc', organizationId: 'org-1' },
      () => createGraphqlRequestClient(base).requestConfig.headers,
    );

    expect(headers).toMatchObject({
      Cookie: 'sid=abc',
      [TRANSCEND_ACTIVE_ORG_ID_HEADER]: 'org-1',
    });
  });

  it('throws an auth error when no credentials exist', () => {
    const base = new TranscendGraphQLBase(null, BASE_URL);

    let caught: unknown;
    try {
      createGraphqlRequestClient(base);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ToolError);
    expect((caught as ToolError).code).toBe(ErrorCode.AUTH_ERROR);
  });

  describe('request timeout', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    /** Runs the client's configured fetch and returns the signal it passed on. */
    async function signalSentTo(callerSignal?: AbortSignal): Promise<AbortSignal> {
      const fetchStub = vi.fn(async () => new Response('{}'));
      vi.stubGlobal('fetch', fetchStub);

      const base = new TranscendGraphQLBase({ type: 'apiKey', apiKey: 'key-1' }, BASE_URL);
      const { fetch: clientFetch } = createGraphqlRequestClient(base).requestConfig;
      await clientFetch!(`${BASE_URL}/graphql`, { signal: callerSignal });

      return (fetchStub.mock.calls[0] as unknown as [string, RequestInit])[1].signal!;
    }

    it('gives every request a signal that is not yet aborted', async () => {
      const signal = await signalSentTo();

      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal.aborted).toBe(false);
    });

    it('still aborts when the caller aborts', async () => {
      const caller = new AbortController();
      const signal = await signalSentTo(caller.signal);

      caller.abort();

      expect(signal.aborted).toBe(true);
    });
  });
});
