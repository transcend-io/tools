import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeGraphQLRequest = vi.fn();

vi.mock('../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: (...args: unknown[]) => makeGraphQLRequest(...args),
  NOOP_LOGGER: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const { fetchActiveSiloDiscoPlugin } = await import('./fetchActiveSiloDiscoPlugin.js');

const client = {} as GraphQLClient;

beforeEach(() => {
  makeGraphQLRequest.mockReset();
  makeGraphQLRequest.mockResolvedValue({ plugins: { nodes: [], totalCount: 0 } });
});

describe('fetchActiveSiloDiscoPlugin', () => {
  it('throws when no plugin is active', async () => {
    await expect(
      fetchActiveSiloDiscoPlugin(client, {
        filterBy: { dataSiloId: 'silo-1' },
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
      }),
    ).rejects.toThrow(/No active data silo plugins/);
  });
});
