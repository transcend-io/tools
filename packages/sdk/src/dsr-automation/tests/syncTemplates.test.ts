import { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeGraphQLRequest = vi.fn();

vi.mock('../../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: (...args: unknown[]) => makeGraphQLRequest(...args),
}));

import { syncTemplate } from '../syncTemplates.js';

describe('syncTemplate', () => {
  const client = new GraphQLClient('https://example.com/graphql');

  beforeEach(() => {
    makeGraphQLRequest.mockReset();
  });

  it('updates an existing template by title', async () => {
    makeGraphQLRequest
      .mockResolvedValueOnce({
        templates: {
          nodes: [
            {
              id: 'tmpl-1',
              title: 'Receipt',
              type: 'EMAIL',
              subject: { defaultMessage: 'Old' },
              template: { defaultMessage: '<p>Old</p>' },
            },
          ],
        },
      })
      .mockResolvedValueOnce({});

    await syncTemplate(client, {
      title: 'Receipt',
      subject: 'Your request',
      body: '<p>Hello</p>',
      type: 'EMAIL',
    });

    expect(makeGraphQLRequest).toHaveBeenLastCalledWith(
      client,
      expect.objectContaining({}),
      expect.objectContaining({
        variables: {
          input: {
            id: 'tmpl-1',
            title: 'Receipt',
            subject: 'Your request',
            template: '<p>Hello</p>',
            type: 'EMAIL',
          },
        },
      }),
    );
  });
});
