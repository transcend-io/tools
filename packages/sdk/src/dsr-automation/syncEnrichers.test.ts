import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeGraphQLRequest = vi.fn();

vi.mock('../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: (...args: unknown[]) => makeGraphQLRequest(...args),
  NOOP_LOGGER: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const { syncEnricher } = await import('./syncEnrichers.js');

const client = {} as GraphQLClient;

beforeEach(() => {
  makeGraphQLRequest.mockReset();
  makeGraphQLRequest.mockResolvedValue({ enrichers: { nodes: [] } });
});

describe('syncEnricher', () => {
  it('rejects new enrichers without input-identifier', async () => {
    await expect(
      syncEnricher(client, {
        input: {
          title: 'Lookup',
          'output-identifiers': ['email'],
        },
        identifierByName: {},
        dataSubjectsByName: {},
      }),
    ).rejects.toThrow(/without input-identifier/);
    expect(makeGraphQLRequest).not.toHaveBeenCalledWith(
      client,
      expect.objectContaining({}),
      expect.objectContaining({ variables: expect.objectContaining({ input: expect.anything() }) }),
    );
  });
});
