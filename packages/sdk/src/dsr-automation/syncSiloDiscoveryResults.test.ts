import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as fetchModule from './fetchAllSiloDiscoveryResults.js';
import {
  MARK_DATA_SILO_DISCOVERY_RESULTS_JUNK,
  UPDATE_DATA_SILO_DISCOVERY_RESULTS,
} from './gqls/siloDiscoveryResult.js';
import { syncSiloDiscoveryResults } from './syncSiloDiscoveryResults.js';

vi.mock('./fetchAllSiloDiscoveryResults.js', () => ({
  fetchAllSiloDiscoveryResults: vi.fn(),
}));

vi.mock('../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: vi.fn(),
  NOOP_LOGGER: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';

const client = {} as GraphQLClient;

describe('syncSiloDiscoveryResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates title and marks ignored when remote rows match', async () => {
    vi.mocked(fetchModule.fetchAllSiloDiscoveryResults).mockResolvedValue([
      {
        id: 'r1',
        resourceId: 'arn:db:1',
        title: 'Old title',
        status: 'PENDING',
        suggestedCatalog: { title: 'MySQL' },
        containsSensitiveData: 'LIKELY',
        plaintextContext: '',
        plugin: { dataSilo: { title: 'AWS' } },
      },
    ]);

    const result = await syncSiloDiscoveryResults(client, [
      {
        resourceId: 'arn:db:1',
        plugin: 'AWS',
        suggestedCatalog: 'Aurora',
        containsSensitiveData: 'LIKELY',
        status: 'IGNORED',
        title: 'New title',
      },
    ]);

    expect(result).toBe(true);
    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      UPDATE_DATA_SILO_DISCOVERY_RESULTS,
      expect.objectContaining({
        variables: {
          input: [
            {
              id: 'r1',
              title: 'New title',
              suggestedDataSiloType: 'Aurora',
            },
          ],
        },
      }),
    );
    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      MARK_DATA_SILO_DISCOVERY_RESULTS_JUNK,
      expect.objectContaining({
        variables: { input: [{ id: 'r1' }] },
      }),
    );
  });
});
