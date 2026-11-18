import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeGraphQLRequest = vi.fn();

vi.mock('../../api/makeGraphQLRequest.js', () => ({
  NOOP_LOGGER: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  makeGraphQLRequest: (...args: unknown[]) => makeGraphQLRequest(...args),
}));

import { UPDATE_DATA_SUBJECT } from '../gqls/dataSubject.js';
import { syncDataSubject } from '../syncDataSubject.js';

/** Unused GraphQL client: requests go through the mocked helper. */
const unusedClient = {} as GraphQLClient;

describe('syncDataSubject', () => {
  beforeEach(() => {
    makeGraphQLRequest.mockReset();
    makeGraphQLRequest.mockResolvedValue({});
  });

  it('applies `active` through a single updateSubject call', async () => {
    await syncDataSubject(unusedClient, {
      input: { type: 'member', title: 'Member', active: true, actions: [] },
      dataSubjectId: 'subject-1',
      skipPublish: true,
    });

    expect(makeGraphQLRequest).toHaveBeenCalledTimes(1);
    const [, document, options] = makeGraphQLRequest.mock.calls[0] as unknown[] as [
      unknown,
      unknown,
      { variables: { input: Record<string, unknown> } },
    ];
    expect(document).toBe(UPDATE_DATA_SUBJECT);
    expect(options.variables.input).toMatchObject({
      id: 'subject-1',
      title: 'Member',
      active: true,
      skipPublish: true,
    });
  });

  it('leaves `active` undefined when the input does not set it', async () => {
    await syncDataSubject(unusedClient, {
      input: { type: 'member', title: 'Member' },
      dataSubjectId: 'subject-1',
    });

    const [, , options] = makeGraphQLRequest.mock.calls[0] as unknown[] as [
      unknown,
      unknown,
      { variables: { input: Record<string, unknown> } },
    ];
    expect(options.variables.input.active).toBeUndefined();
  });
});
