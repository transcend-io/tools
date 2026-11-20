import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeGraphQLRequest = vi.fn();

vi.mock('../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: (...args: unknown[]) => makeGraphQLRequest(...args),
  NOOP_LOGGER: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const { fetchApiKeys } = await import('./fetchApiKeys.js');

const client = {} as GraphQLClient;

beforeEach(() => {
  makeGraphQLRequest.mockReset();
  makeGraphQLRequest.mockResolvedValue({
    apiKeys: { nodes: [{ title: 'existing-key', id: 'k1' }] },
  });
});

describe('fetchApiKeys', () => {
  it('throws instead of exiting when API key titles are missing', async () => {
    await expect(
      fetchApiKeys(client, {
        apiKeyInputs: {
          'data-silos': [{ 'api-key-title': 'missing-key' }],
        },
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
      }),
    ).rejects.toThrow(/Failed to find API keys "missing-key"/);
  });
});
