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

const emptyUserNode = {
  id: 'u-1',
  email: 'a@example.com',
  name: 'Ada',
  isAdmin: false,
  isInvited: false,
  isLocked: false,
  lastLoggedIn: null,
  teams: [],
  scopes: [],
};

describe('AdminMixin', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('listUsers', () => {
    it('sends empty filterBy object when no filter is provided', async () => {
      const mockFetch = mockFetchQueue([
        {
          users: {
            nodes: [emptyUserNode],
            totalCount: 1,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new AdminMixin(API_KEY_AUTH);
      await client.listUsers({ first: 25 });

      const body = lastRequestBody(mockFetch);
      expect(body.variables).toEqual({
        first: 25,
        offset: 0,
        filterBy: {},
        orderBy: null,
      });
    });

    it('passes sparse filterBy, offset, and orderBy when provided', async () => {
      const mockFetch = mockFetchQueue([
        {
          users: {
            nodes: [emptyUserNode],
            totalCount: 1,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new AdminMixin(API_KEY_AUTH);
      const filterBy = {
        text: 'Ada',
        isAdmin: true,
        isInvited: false,
        isLocked: false,
        teamIds: ['11111111-1111-1111-1111-111111111111'],
        scopeNames: ['viewDataMap' as const],
        lastLoggedInAfter: '2024-01-01T00:00:00.000Z',
        lastLoggedInBefore: '2024-12-31T23:59:59.999Z',
      };
      const orderBy = [{ field: 'name' as const, direction: 'ASC' as const }];
      await client.listUsers({
        first: 10,
        offset: 20,
        filterBy,
        orderBy,
      });

      const body = lastRequestBody(mockFetch);
      expect(body.variables).toEqual({
        first: 10,
        offset: 20,
        filterBy,
        orderBy,
      });
    });

    it('computes hasNextPage from offset + nodes vs totalCount', async () => {
      const mockFetch = mockFetchQueue([
        {
          users: {
            nodes: [emptyUserNode],
            totalCount: 3,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new AdminMixin(API_KEY_AUTH);
      const result = await client.listUsers({ first: 1, offset: 0 });

      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
      expect(result.nodes[0]).toMatchObject({
        id: 'u-1',
        email: 'a@example.com',
        name: 'Ada',
        isAdmin: false,
        isInvited: false,
        isLocked: false,
      });
    });
  });
});
