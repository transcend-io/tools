import type { Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchAllAssessmentTemplates } from '../fetchAllAssessmentTemplates.js';
import { fetchAllRequests, fetchRequestsTotalCount } from '../fetchAllRequests.js';
import { fetchRequestDataSiloActiveCount } from '../fetchRequestDataSiloActiveCount.js';

const mocks = vi.hoisted(() => ({
  makeGraphQLRequest: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  makeGraphQLRequest: mocks.makeGraphQLRequest,
  REDUCED_REQUESTS_FOR_DATA_SILO_COUNT: 'ReducedRequestsForDataSiloCount',
}));

describe('GraphQL logger dependencies', () => {
  const client = {} as GraphQLClient;
  const logger: Logger = {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the injected logger when fetching a request count', async () => {
    mocks.makeGraphQLRequest.mockResolvedValueOnce({
      requests: { totalCount: 12 },
    });

    await expect(fetchRequestsTotalCount(client, {}, { logger })).resolves.toBe(12);
    expect(mocks.makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      expect.anything(),
      expect.objectContaining({ logger }),
    );
  });

  it('uses the injected logger when fetching requests', async () => {
    const onPage = vi.fn();
    mocks.makeGraphQLRequest.mockResolvedValueOnce({
      requests: {
        nodes: [],
        pageInfo: {
          endCursor: null,
          hasNextPage: false,
        },
      },
    });

    await fetchAllRequests(client, { onPage }, { logger });

    expect(onPage).toHaveBeenCalledWith([]);
    expect(mocks.makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      expect.anything(),
      expect.objectContaining({ logger }),
    );
  });

  it('uses the injected logger when fetching an active data silo count', async () => {
    mocks.makeGraphQLRequest.mockResolvedValueOnce({
      listReducedRequestsForDataSilo: { totalCount: 7 },
    });

    await expect(
      fetchRequestDataSiloActiveCount(client, { dataSiloId: 'data-silo-id' }, { logger }),
    ).resolves.toBe(7);
    expect(mocks.makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      'ReducedRequestsForDataSiloCount',
      expect.objectContaining({ logger }),
    );
  });

  it('uses the injected logger when fetching assessment templates', async () => {
    mocks.makeGraphQLRequest.mockResolvedValueOnce({
      assessmentFormTemplates: {
        nodes: [
          { id: 'second', title: 'Second' },
          { id: 'first', title: 'First' },
        ],
      },
    });

    const templates = await fetchAllAssessmentTemplates(client, { logger });

    expect(templates.map(({ id }) => id)).toEqual(['first', 'second']);
    expect(mocks.makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      expect.anything(),
      expect.objectContaining({ logger }),
    );
  });
});
