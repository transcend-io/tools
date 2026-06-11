import type { Got } from 'got';
/* eslint-disable @typescript-eslint/no-explicit-any, require-await */
import type { GraphQLClient } from 'graphql-request';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Collapse backoff sleeps so retry tests stay fast while keeping real
// extractErrorMessage semantics.
vi.mock('@transcend-io/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@transcend-io/utils')>();
  return {
    ...actual,
    sleepPromise: vi.fn(async () => 0),
  };
});

import {
  fetchAllRequestIdentifiers,
  fetchRequestIdentifiersBatch,
} from '../fetchAllRequestIdentifiers.js';

/**
 * Build a stub `Got`-like instance where each `.post(...).json()` call
 * resolves to the next value in the queue (or throws when the value is an
 * instance of `Error`). Fails the test if the queue runs out.
 */
function makeSombraStub(sequence: unknown[]): {
  /** `Got`-shaped stub */
  sombra: Got;
  /** Captured POST calls */
  calls: Array<{
    /** URL hit */
    url: string;
    /** JSON body sent */
    json: any;
  }>;
} {
  const queue = [...sequence];
  const calls: Array<{
    /** URL hit */
    url: string;
    /** JSON body sent */
    json: any;
  }> = [];

  const sombra = {
    post: vi.fn((url: string, opts: { /** JSON body */ json: any }) => {
      calls.push({ url, json: opts.json });
      return {
        json: vi.fn(async () => {
          if (queue.length === 0) {
            throw new Error('unexpected extra call to sombra.post');
          }
          const next = queue.shift();
          if (next instanceof Error) {
            throw next;
          }
          return next;
        }),
      };
    }),
  } as unknown as Got;

  return { sombra, calls };
}

/**
 * Build a stub `Got`-like instance whose response is derived from the request
 * body. Useful when calls run concurrently and the queue-based stub's ordering
 * would be non-deterministic.
 */
function makeSombraResponder(respond: (json: any) => unknown): {
  /** `Got`-shaped stub */
  sombra: Got;
  /** Captured POST calls */
  calls: Array<{
    /** URL hit */
    url: string;
    /** JSON body sent */
    json: any;
  }>;
} {
  const calls: Array<{
    /** URL hit */
    url: string;
    /** JSON body sent */
    json: any;
  }> = [];

  const sombra = {
    post: vi.fn((url: string, opts: { /** JSON body */ json: any }) => {
      calls.push({ url, json: opts.json });
      return {
        json: vi.fn(async () => respond(opts.json)),
      };
    }),
  } as unknown as Got;

  return { sombra, calls };
}

/** Minimal silent logger */
const silentLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

/** Unused GraphQL client — skipSombraCheck means it is never called. */
const unusedClient = {} as GraphQLClient;

describe('fetchAllRequestIdentifiers', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  it('returns decoded identifiers on a single-page happy path', async () => {
    const identifiers = [
      { id: 'ri_1', name: 'email', value: 'a@b.com', type: 'email' },
      { id: 'ri_2', name: 'userId', value: 'u-1', type: 'custom' },
    ];

    const { sombra, calls } = makeSombraStub([
      { identifiers, pageInfo: { endCursor: null, hasNextPage: false } },
    ]);

    const out = await fetchAllRequestIdentifiers(unusedClient, sombra, {
      filterBy: { requestId: 'req-1' },
      skipSombraCheck: true,
      logger: silentLogger,
    });

    expect(out).toEqual(identifiers);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('v1/request-identifiers');
    expect(calls[0]!.json).toEqual({ first: 100, after: undefined, requestId: 'req-1' });
  });

  it('retries when sombra returns a transient 502 and then succeeds', async () => {
    const identifiers = [{ id: 'ri_1', name: 'email', value: 'a@b.com', type: 'email' }];

    // Emulate `got`'s HTTPError for a 502 response: message + response.statusCode
    const httpError = Object.assign(new Error('Response code 502 (Bad Gateway)'), {
      response: { statusCode: 502, statusMessage: 'Bad Gateway', body: '<html>502</html>' },
    });

    const { sombra, calls } = makeSombraStub([
      httpError,
      { identifiers, pageInfo: { endCursor: null, hasNextPage: false } },
    ]);

    const out = await fetchAllRequestIdentifiers(unusedClient, sombra, {
      filterBy: { requestId: 'req-2' },
      skipSombraCheck: true,
      logger: silentLogger,
    });

    expect(out).toEqual(identifiers);
    expect(calls).toHaveLength(2);
    expect(calls[0]!.json.after).toBeUndefined();
    expect(calls[1]!.json.after).toBeUndefined(); // retry uses the same cursor
  });

  it('rethrows a formatted error when transient errors exhaust retries', async () => {
    const httpError = Object.assign(new Error('Response code 502 (Bad Gateway)'), {
      response: { statusCode: 502, statusMessage: 'Bad Gateway' },
    });

    // maxAttempts in fetchAllRequestIdentifiers is 6, so produce 6 consecutive 502s.
    const { sombra } = makeSombraStub(Array.from({ length: 6 }, () => httpError));

    await expect(
      fetchAllRequestIdentifiers(unusedClient, sombra, {
        filterBy: { requestId: 'req-3' },
        skipSombraCheck: true,
        logger: silentLogger,
      }),
    ).rejects.toThrow(/Failed to fetch request identifiers failed after 6 attempt\(s\)/);
  });

  it('does not retry non-transient errors (e.g. 400)', async () => {
    const httpError = Object.assign(new Error('Response code 400 (Bad Request)'), {
      response: { statusCode: 400, statusMessage: 'Bad Request' },
    });

    const { sombra, calls } = makeSombraStub([httpError]);

    await expect(
      fetchAllRequestIdentifiers(unusedClient, sombra, {
        filterBy: { requestId: 'req-4' },
        skipSombraCheck: true,
        logger: silentLogger,
      }),
    ).rejects.toThrow(/Failed to fetch request identifiers failed after 1 attempt\(s\)/);

    expect(calls).toHaveLength(1);
  });

  it('walks through multiple pages until hasNextPage is false', async () => {
    const page1 = {
      identifiers: Array.from({ length: 100 }, (_, i) => ({
        id: `ri_${i}`,
        name: 'email',
        value: `u${i}@b.com`,
        type: 'email',
      })),
      pageInfo: { endCursor: 'cursor-1', hasNextPage: true },
    };
    const page2 = {
      identifiers: [{ id: 'ri_100', name: 'email', value: 'last@b.com', type: 'email' }],
      pageInfo: { endCursor: null, hasNextPage: false },
    };

    const { sombra, calls } = makeSombraStub([page1, page2]);

    const out = await fetchAllRequestIdentifiers(unusedClient, sombra, {
      filterBy: { requestId: 'req-5' },
      skipSombraCheck: true,
      logger: silentLogger,
    });

    expect(out).toHaveLength(101);
    expect(calls).toHaveLength(2);
    expect(calls[0]!.json.after).toBeUndefined();
    expect(calls[1]!.json.after).toBe('cursor-1'); // second page follows the cursor
  });
});

describe('fetchRequestIdentifiersBatch', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  it('returns identifiers keyed by requestId on a single-page happy path', async () => {
    const identifiers = [
      { id: 'ri_1', name: 'email', value: 'a@b.com', type: 'email', requestId: 'req-1' },
      { id: 'ri_2', name: 'userId', value: 'u-1', type: 'custom', requestId: 'req-2' },
    ];

    const { sombra, calls } = makeSombraStub([
      { identifiers, pageInfo: { endCursor: null, hasNextPage: false } },
    ]);

    // concurrency: 1 keeps all requestIds in a single group / single call.
    const out = await fetchRequestIdentifiersBatch(sombra, {
      requestIds: ['req-1', 'req-2'],
      concurrency: 1,
      logger: silentLogger,
    });

    expect(out.get('req-1')).toEqual([
      { id: 'ri_1', name: 'email', value: 'a@b.com', type: 'email' },
    ]);
    expect(out.get('req-2')).toEqual([
      { id: 'ri_2', name: 'userId', value: 'u-1', type: 'custom' },
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('v1/request-identifiers');
    expect(calls[0]!.json).toEqual({
      first: 100,
      after: undefined,
      requestIds: ['req-1', 'req-2'],
    });
  });

  it('includes an empty entry for requestIds Sombra returns nothing for', async () => {
    const { sombra } = makeSombraStub([
      {
        identifiers: [
          { id: 'ri_1', name: 'email', value: 'a@b.com', type: 'email', requestId: 'req-1' },
        ],
        pageInfo: { endCursor: null, hasNextPage: false },
      },
    ]);

    const out = await fetchRequestIdentifiersBatch(sombra, {
      requestIds: ['req-1', 'req-2'],
      concurrency: 1,
      logger: silentLogger,
    });

    expect(out.get('req-1')).toHaveLength(1);
    expect(out.get('req-2')).toEqual([]);
  });

  it('returns an empty map without calling sombra when requestIds is empty', async () => {
    const { sombra, calls } = makeSombraStub([]);

    const out = await fetchRequestIdentifiersBatch(sombra, {
      requestIds: [],
      logger: silentLogger,
    });

    expect(out.size).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('walks multiple pages within a group following the cursor', async () => {
    const page1 = {
      identifiers: Array.from({ length: 100 }, (_, i) => ({
        id: `ri_${i}`,
        name: 'email',
        value: `u${i}@b.com`,
        type: 'email',
        requestId: 'req-1',
      })),
      pageInfo: { endCursor: 'cursor-1', hasNextPage: true },
    };
    const page2 = {
      identifiers: [
        { id: 'ri_100', name: 'email', value: 'last@b.com', type: 'email', requestId: 'req-1' },
      ],
      pageInfo: { endCursor: null, hasNextPage: false },
    };

    const { sombra, calls } = makeSombraStub([page1, page2]);

    const out = await fetchRequestIdentifiersBatch(sombra, {
      requestIds: ['req-1'],
      concurrency: 1,
      logger: silentLogger,
    });

    expect(out.get('req-1')).toHaveLength(101);
    expect(calls).toHaveLength(2);
    expect(calls[0]!.json.after).toBeUndefined();
    expect(calls[1]!.json.after).toBe('cursor-1'); // second page follows the cursor
  });

  it('retries when sombra returns a transient 502 and then succeeds', async () => {
    const httpError = Object.assign(new Error('Response code 502 (Bad Gateway)'), {
      response: { statusCode: 502, statusMessage: 'Bad Gateway', body: '<html>502</html>' },
    });

    const { sombra, calls } = makeSombraStub([
      httpError,
      {
        identifiers: [
          { id: 'ri_1', name: 'email', value: 'a@b.com', type: 'email', requestId: 'req-1' },
        ],
        pageInfo: { endCursor: null, hasNextPage: false },
      },
    ]);

    const out = await fetchRequestIdentifiersBatch(sombra, {
      requestIds: ['req-1'],
      concurrency: 1,
      logger: silentLogger,
    });

    expect(out.get('req-1')).toHaveLength(1);
    expect(calls).toHaveLength(2);
    expect(calls[1]!.json.after).toBeUndefined(); // retry uses the same cursor
  });

  it('splits requestIds into parallel groups according to concurrency', async () => {
    // Respond based on the request body so concurrent group ordering is irrelevant.
    const { sombra, calls } = makeSombraResponder((json) => ({
      identifiers: (json.requestIds as string[]).map((requestId, i) => ({
        id: `ri_${requestId}_${i}`,
        name: 'email',
        value: `${requestId}@b.com`,
        type: 'email',
        requestId,
      })),
      pageInfo: { endCursor: null, hasNextPage: false },
    }));

    const out = await fetchRequestIdentifiersBatch(sombra, {
      requestIds: ['a', 'b', 'c', 'd'],
      concurrency: 2,
      logger: silentLogger,
    });

    // 4 ids across 2 groups => 2 groups of 2 => 2 calls.
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.json.requestIds).toHaveLength(2);
    }
    expect([...out.keys()].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(out.get('a')).toHaveLength(1);
    expect(out.get('d')).toHaveLength(1);
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any, require-await */
