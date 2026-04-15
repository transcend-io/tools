import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { AuthCredentials } from '../src/auth.js';
import { TranscendGraphQLBase } from '../src/clients/graphql/base.js';
import { ToolError, ErrorCode } from '../src/errors.js';

class TestGraphQLClient extends TranscendGraphQLBase {
  async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return this.makeRequest<T>(query, variables);
  }
}

function createMockFetchResponse<T>(
  overrides: {
    ok?: boolean;
    status?: number;
    statusText?: string;
    data?: T;
    errors?: Array<{ message: string }>;
    text?: string;
  } = {},
) {
  const { ok = true, status = 200, statusText = 'OK', data, errors, text = '' } = overrides;

  return vi.fn().mockImplementation(async () => {
    if (!ok && !text) {
      return {
        ok,
        status,
        statusText,
        text: async () => `HTTP ${status} ${statusText}`,
        json: async () => {
          throw new Error('Response not JSON');
        },
      };
    }
    return {
      ok,
      status,
      statusText,
      text: async () => text || `HTTP ${status} ${statusText}`,
      json: async () => {
        if (errors && errors.length > 0) {
          return { data: undefined, errors };
        }
        return { data: data ?? {} };
      },
    };
  });
}

describe('TranscendGraphQLBase', () => {
  const API_KEY = 'test-api-key-12345';
  const API_KEY_AUTH: AuthCredentials = { type: 'apiKey', apiKey: API_KEY };
  const SESSION_COOKIE_AUTH: AuthCredentials = {
    type: 'sessionCookie',
    cookie: 'laravel_session=abc123',
    organizationId: 'org-uuid-456',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('sets defaults correctly: baseUrl, strips trailing slash', () => {
      const client = new TestGraphQLClient(API_KEY_AUTH, 'https://custom.api.com/');
      expect(client.getBaseUrl()).toBe('https://custom.api.com');
    });

    it('uses default baseUrl when not provided', () => {
      const client = new TestGraphQLClient(API_KEY_AUTH);
      expect(client.getBaseUrl()).toBe('https://api.transcend.io');
    });

    it('preserves baseUrl without trailing slash', () => {
      const client = new TestGraphQLClient(API_KEY_AUTH, 'https://api.example.com');
      expect(client.getBaseUrl()).toBe('https://api.example.com');
    });
  });

  describe('makeRequest - headers', () => {
    it('sends Authorization header with API key auth', async () => {
      const mockFetch = createMockFetchResponse({
        data: { __typename: 'Query' },
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(API_KEY_AUTH);
      await client.query('query { __typename }');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }),
        }),
      );
    });

    it('sends Cookie and org ID headers with session cookie auth', async () => {
      const mockFetch = createMockFetchResponse({
        data: { __typename: 'Query' },
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(SESSION_COOKIE_AUTH);
      await client.query('query { __typename }');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Cookie: 'laravel_session=abc123',
            'x-transcend-active-organization-id': 'org-uuid-456',
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }),
        }),
      );
    });

    it('does not send Authorization header with session cookie auth', async () => {
      const mockFetch = createMockFetchResponse({
        data: { __typename: 'Query' },
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(SESSION_COOKIE_AUTH);
      await client.query('query { __typename }');

      const calledHeaders = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
      expect(calledHeaders).not.toHaveProperty('Authorization');
    });
  });

  describe('makeRequest - retries on 5xx', () => {
    it('retries up to 3 times on 5xx errors, then succeeds', async () => {
      vi.useFakeTimers();

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Server error',
          json: async () => {
            throw new Error('Not JSON');
          },
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
          text: async () => 'Bad gateway',
          json: async () => {
            throw new Error('Not JSON');
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => '',
          json: async () => ({ data: { result: 'ok' } }),
        });

      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(API_KEY_AUTH);
      const promise = client.query('query { __typename }');

      await vi.advanceTimersByTimeAsync(3500);

      const result = await promise;

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ result: 'ok' });

      vi.useRealTimers();
    });

    it('throws after exhausting retries on 5xx', async () => {
      vi.useFakeTimers();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
        json: async () => {
          throw new Error('Not JSON');
        },
      });

      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(API_KEY_AUTH);
      const promise = client.query('query { __typename }');

      const rejectionPromise = expect(promise).rejects.toThrow(/Server error \(500\)/);

      await vi.advanceTimersByTimeAsync(8000);

      await rejectionPromise;
      expect(fetch).toHaveBeenCalledTimes(4); // initial + 3 retries

      vi.useRealTimers();
    });
  });

  describe('makeRequest - retries on 429', () => {
    it('retries on 429 (rate limited)', async () => {
      vi.useFakeTimers();

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: async () => 'Rate limited',
          json: async () => {
            throw new Error('Not JSON');
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => '',
          json: async () => ({ data: { result: 'ok' } }),
        });

      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(API_KEY_AUTH);
      const promise = client.query('query { __typename }');

      await vi.advanceTimersByTimeAsync(1500);

      const result = await promise;

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ result: 'ok' });

      vi.useRealTimers();
    });
  });

  describe('makeRequest - does NOT retry on 4xx (except 429)', () => {
    it.each([400, 401, 403, 404])('does not retry on %d', async (status) => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status,
        statusText: 'Client Error',
        text: async () => `Error ${status}`,
        json: async () => {
          throw new Error('Not JSON');
        },
      });

      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(API_KEY_AUTH);

      await expect(client.query('query { __typename }')).rejects.toThrow(/error/i);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('makeRequest - structured ToolError', () => {
    it('throws ToolError with AUTH_ERROR code on 401', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Bad token',
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(API_KEY_AUTH);
      try {
        await client.query('query { __typename }');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ToolError);
        expect((err as ToolError).code).toBe(ErrorCode.AUTH_ERROR);
        expect((err as ToolError).retryable).toBe(false);
      }
    });

    it('throws ToolError with RATE_LIMITED code on 429 (retryable)', async () => {
      vi.useFakeTimers();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Slow down',
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(API_KEY_AUTH);
      const promise = client.query('query { __typename }');

      const rejection = expect(promise).rejects.toBeInstanceOf(ToolError);
      await vi.advanceTimersByTimeAsync(8000);

      await rejection;
      try {
        await promise;
      } catch (err) {
        expect((err as ToolError).code).toBe(ErrorCode.RATE_LIMITED);
        expect((err as ToolError).retryable).toBe(true);
      }

      vi.useRealTimers();
    });
  });

  describe('makeRequest - GraphQL errors', () => {
    it('throws on GraphQL errors in response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '',
        json: async () => ({
          data: null,
          errors: [{ message: 'Unauthorized' }, { message: 'Invalid query' }],
        }),
      });

      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(API_KEY_AUTH);

      await expect(client.query('query { __typename }')).rejects.toThrow(
        /GraphQL errors: Unauthorized; Invalid query/,
      );
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('throws when response has no data', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '',
        json: async () => ({ data: undefined }),
      });

      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(API_KEY_AUTH);

      await expect(client.query('query { __typename }')).rejects.toThrow(
        /GraphQL response missing data/,
      );
    });
  });

  describe('makeRequest - timeout', () => {
    it('throws timeout error when fetch aborts (AbortError)', async () => {
      const abortError = new DOMException('Aborted', 'AbortError');
      const mockFetch = vi.fn().mockRejectedValue(abortError);

      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(API_KEY_AUTH);

      await expect(client.query('query { __typename }')).rejects.toThrow(
        /GraphQL request timeout after 30000ms/,
      );
    });
  });

  describe('rate limiting', () => {
    it('enforces ~200ms delay between requests', async () => {
      const mockFetch = createMockFetchResponse({
        data: { result: 'ok' },
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(API_KEY_AUTH);

      const start = Date.now();
      await client.query('query { __typename }');
      await client.query('query { __typename }');
      const elapsed = Date.now() - start;

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(elapsed).toBeGreaterThanOrEqual(190); // allow small variance
    });
  });

  describe('query with variables', () => {
    it('sends variables in the request body', async () => {
      const mockFetch = createMockFetchResponse({
        data: { result: { id: 'test-123' } },
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(API_KEY_AUTH);
      const variables = { input: { title: 'Test', scopes: ['READ'] } };
      const result = await client.query(
        'mutation Test($input: TestInput!) { test(input: $input) { id } }',
        variables,
      );

      expect(result).toEqual({ result: { id: 'test-123' } });

      const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(callBody.variables).toEqual(variables);
      expect(callBody.query).toContain('mutation Test');
    });
  });

  describe('query sends to correct URL', () => {
    it('posts to baseUrl/graphql', async () => {
      const mockFetch = createMockFetchResponse({
        data: { __typename: 'Query' },
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(API_KEY_AUTH);
      await client.query('query { __typename }');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.transcend.io/graphql',
        expect.objectContaining({
          body: expect.stringContaining('__typename'),
        }),
      );
    });
  });

  describe('null auth (sidecar pattern)', () => {
    it('constructs without error when auth is null', () => {
      expect(() => new TestGraphQLClient(null)).not.toThrow();
    });

    it('throws AUTH_ERROR on makeRequest when auth is null', async () => {
      const client = new TestGraphQLClient(null);
      await expect(client.query('query { __typename }')).rejects.toThrow(
        /No authentication configured/,
      );
    });
  });

  describe('updateAuth', () => {
    it('switches from null to API key auth', async () => {
      const mockFetch = createMockFetchResponse({
        data: { __typename: 'Query' },
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(null);

      await expect(client.query('query { __typename }')).rejects.toThrow();

      client.updateAuth(API_KEY_AUTH);
      await client.query('query { __typename }');

      const calledHeaders = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
      expect(calledHeaders.Authorization).toBe(`Bearer ${API_KEY}`);
    });

    it('switches from API key to session cookie auth', async () => {
      const mockFetch = createMockFetchResponse({
        data: { __typename: 'Query' },
      });
      vi.stubGlobal('fetch', mockFetch);

      const client = new TestGraphQLClient(API_KEY_AUTH);
      client.updateAuth(SESSION_COOKIE_AUTH);
      await client.query('query { __typename }');

      const calledHeaders = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
      expect(calledHeaders.Cookie).toBe('laravel_session=abc123');
      expect(calledHeaders['x-transcend-active-organization-id']).toBe('org-uuid-456');
      expect(calledHeaders).not.toHaveProperty('Authorization');
    });
  });
});
