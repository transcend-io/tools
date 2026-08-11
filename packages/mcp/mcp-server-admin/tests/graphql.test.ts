import type { AuthCredentials } from '@transcend-io/mcp-server-base';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminMixin } from '../src/graphql.js';

const API_KEY_AUTH: AuthCredentials = { type: 'apiKey', apiKey: 'test-api-key-12345' };

function mockFetchQueue(payloads: unknown[]) {
  let call = 0;
  return vi.fn().mockImplementation(async () => {
    const payload = payloads[Math.min(call, payloads.length - 1)];
    call += 1;
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'OK',
      json: async () => ({ data: payload }),
    };
  });
}

function lastRequestBody(mockFetch: ReturnType<typeof vi.fn>) {
  const [, init] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
  return JSON.parse(init.body as string) as {
    query: string;
    variables: Record<string, unknown>;
  };
}

describe('AdminMixin', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('listUsers', () => {
    it('omits filterBy when no filter is provided', async () => {
      const mockFetch = mockFetchQueue([
        {
          users: {
            nodes: [{ id: 'u-1', email: 'a@example.com', name: 'Ada' }],
            totalCount: 1,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new AdminMixin(API_KEY_AUTH);
      await client.listUsers({ first: 25 });

      const body = lastRequestBody(mockFetch);
      expect(body.variables).toEqual({ first: 25 });
      expect(body.variables).not.toHaveProperty('filterBy');
    });

    it('passes filterBy when provided', async () => {
      const mockFetch = mockFetchQueue([
        {
          users: {
            nodes: [{ id: 'u-1', email: 'a@example.com', name: 'Ada' }],
            totalCount: 1,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new AdminMixin(API_KEY_AUTH);
      await client.listUsers({ first: 10, filterBy: { text: 'Ada' } });

      const body = lastRequestBody(mockFetch);
      expect(body.variables).toEqual({ first: 10, filterBy: { text: 'Ada' } });
    });
  });
});
