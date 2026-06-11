/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GraphQLClient } from 'graphql-request';
import { describe, it, expect, vi } from 'vitest';

import { fetchAllRequestIdentifierMetadata } from '../fetchAllRequestIdentifierMetadata.js';

/**
 * Build a stub `GraphQLClient` whose `request` resolves to the next value in
 * the queue. Captures the variables passed on each call so cursor walking and
 * filter shaping can be asserted. Fails if the queue runs out.
 */
function makeClientStub(sequence: unknown[]): {
  /** `GraphQLClient`-shaped stub */
  client: GraphQLClient;
  /** Captured variables per request */
  calls: any[];
} {
  const queue = [...sequence];
  const calls: any[] = [];

  const client = {
    request: vi.fn(async (_document: unknown, variables: any) => {
      calls.push(variables);
      if (queue.length === 0) {
        throw new Error('unexpected extra call to client.request');
      }
      return queue.shift();
    }),
  } as unknown as GraphQLClient;

  return { client, calls };
}

/** Minimal silent logger */
const silentLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

describe('fetchAllRequestIdentifierMetadata', () => {
  it('returns nodes on a single-page happy path and resolves requestId to requestIds', async () => {
    const nodes = [
      { id: 'ri_1', name: 'email', isVerifiedAtLeastOnce: true },
      { id: 'ri_2', name: 'phone', isVerifiedAtLeastOnce: false },
    ];

    const { client, calls } = makeClientStub([
      { requestIdentifiers: { nodes, pageInfo: { endCursor: null, hasNextPage: false } } },
    ]);

    const out = await fetchAllRequestIdentifierMetadata(client, {
      filterBy: { requestId: 'req-1' },
      logger: silentLogger,
    });

    expect(out).toEqual(nodes);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      first: 2000,
      after: undefined,
      requestIds: ['req-1'],
    });
  });

  it('walks through multiple pages until hasNextPage is false', async () => {
    const page1 = {
      requestIdentifiers: {
        nodes: [{ id: 'ri_1', name: 'email', isVerifiedAtLeastOnce: true }],
        pageInfo: { endCursor: 'cursor-1', hasNextPage: true },
      },
    };
    const page2 = {
      requestIdentifiers: {
        nodes: [{ id: 'ri_2', name: 'phone', isVerifiedAtLeastOnce: false }],
        pageInfo: { endCursor: null, hasNextPage: false },
      },
    };

    const { client, calls } = makeClientStub([page1, page2]);

    const out = await fetchAllRequestIdentifierMetadata(client, {
      filterBy: { requestIds: ['req-1', 'req-2'] },
      logger: silentLogger,
    });

    expect(out).toHaveLength(2);
    expect(calls).toHaveLength(2);
    expect(calls[0].after).toBeUndefined();
    expect(calls[1].after).toBe('cursor-1'); // second page follows the cursor
    expect(calls[1].requestIds).toEqual(['req-1', 'req-2']);
  });

  it('passes updatedAt filters as ISO strings', async () => {
    const before = new Date('2026-01-02T00:00:00.000Z');
    const after = new Date('2026-01-01T00:00:00.000Z');

    const { client, calls } = makeClientStub([
      { requestIdentifiers: { nodes: [], pageInfo: { endCursor: null, hasNextPage: false } } },
    ]);

    await fetchAllRequestIdentifierMetadata(client, {
      filterBy: { updatedAtBefore: before, updatedAtAfter: after },
      logger: silentLogger,
    });

    expect(calls[0]).toMatchObject({
      updatedAtBefore: '2026-01-02T00:00:00.000Z',
      updatedAtAfter: '2026-01-01T00:00:00.000Z',
    });
  });

  it('returns an empty list when the first page has no nodes', async () => {
    const { client, calls } = makeClientStub([
      { requestIdentifiers: { nodes: [], pageInfo: { endCursor: null, hasNextPage: false } } },
    ]);

    const out = await fetchAllRequestIdentifierMetadata(client, { logger: silentLogger });

    expect(out).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(calls[0].requestIds).toBeUndefined();
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */
