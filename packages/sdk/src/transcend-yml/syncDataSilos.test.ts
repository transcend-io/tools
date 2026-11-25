import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CREATE_DATA_SILOS, UPDATE_DATA_SILOS } from '../data-inventory/gqls/dataSilo.js';

const makeGraphQLRequest = vi.fn();
const fetchAllDataSilos = vi.fn();

vi.mock('../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: (...args: unknown[]) => makeGraphQLRequest(...args),
  NOOP_LOGGER: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../index.js')>();
  return {
    ...actual,
    fetchAllDataSilos: (...args: unknown[]) => fetchAllDataSilos(...args),
    convertToDataSubjectBlockList: () => [],
  };
});

const { syncDataSilos } = await import('./syncDataSilos.js');

const client = {} as GraphQLClient;
const onError = vi.fn();

beforeEach(() => {
  makeGraphQLRequest.mockReset();
  fetchAllDataSilos.mockReset();
  onError.mockReset();
  fetchAllDataSilos.mockResolvedValue([
    { id: 'silo-a', title: 'Silo A' },
    { id: 'silo-b', title: 'Silo B' },
  ]);
});

describe('syncDataSilos batch updates', () => {
  it('retries individually when a batch update fails and continues syncing others', async () => {
    let updateCalls = 0;
    makeGraphQLRequest.mockImplementation(async (_client, document, options) => {
      if (document === CREATE_DATA_SILOS) {
        return { createDataSilos: { dataSilos: [] } };
      }
      if (document === UPDATE_DATA_SILOS) {
        updateCalls += 1;
        const titles = (options as { variables: { input: { dataSilos: { id: string }[] } } })
          .variables.input.dataSilos;
        if (titles.length > 1) {
          throw new Error('No valid email domain found for organization');
        }
        if (titles[0]?.id === 'silo-a') {
          throw new Error('No valid email domain found for organization');
        }
        return { updateDataSilos: { dataSilos: [{ id: 'silo-b', title: 'Silo B' }] } };
      }
      return {};
    });

    const result = await syncDataSilos(
      [
        { title: 'Silo A', integrationName: 'x' },
        { title: 'Silo B', integrationName: 'y' },
      ],
      client,
      {
        pageSize: 50,
        dataSubjectsByName: {},
        apiKeysByTitle: {},
        onError,
      },
    );

    expect(result.success).toBe(false);
    expect(updateCalls).toBeGreaterThan(1);
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/Silo A/), 'Silo A');
    expect(onError).not.toHaveBeenCalledWith(expect.stringMatching(/Silo B/), 'Silo B');
  });
});
