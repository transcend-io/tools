import { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeGraphQLRequest = vi.fn();

vi.mock('../../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: (...args: unknown[]) => makeGraphQLRequest(...args),
}));

import { syncAction } from '../syncAction.js';

describe('syncAction', () => {
  const client = new GraphQLClient('https://example.com/graphql');

  beforeEach(() => {
    makeGraphQLRequest.mockReset();
  });

  it('sends title, description, and file form items', async () => {
    makeGraphQLRequest.mockResolvedValueOnce({});

    await syncAction(
      client,
      {
        action: {
          title: 'Access your data',
          description: 'We will compile a report',
          fileFormItems: [
            {
              internalName: 'proof',
              label: 'Upload ID',
              isRequired: true,
              index: 0,
            },
          ],
        },
        actionId: 'act-1',
      },
      {},
    );

    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      expect.anything(),
      expect.objectContaining({
        variables: {
          input: expect.objectContaining({
            id: 'act-1',
            title: 'Access your data',
            description: 'We will compile a report',
            fileFormItems: [expect.objectContaining({ internalName: 'proof', label: 'Upload ID' })],
          }),
        },
      }),
    );
  });
});
