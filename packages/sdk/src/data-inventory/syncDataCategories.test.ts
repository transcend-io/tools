import { DataCategoryType } from '@transcend-io/privacy-types';
import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CREATE_DATA_SUB_CATEGORY, UPDATE_DATA_SUB_CATEGORIES } from './gqls/dataCategory.js';

const makeGraphQLRequest = vi.fn();

vi.mock('../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: (...args: unknown[]) => makeGraphQLRequest(...args),
  NOOP_LOGGER: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const fetchAllDataCategories = vi.fn();
vi.mock('./fetchAllDataCategories.js', () => ({
  fetchAllDataCategories: (...args: unknown[]) => fetchAllDataCategories(...args),
}));

const { syncDataCategories } = await import('./syncDataCategories.js');

const client = {} as GraphQLClient;
const onError = vi.fn();

beforeEach(() => {
  makeGraphQLRequest.mockReset();
  fetchAllDataCategories.mockReset();
  onError.mockReset();
  fetchAllDataCategories.mockResolvedValue([
    { id: 'cat-1', name: 'Other', category: DataCategoryType.Demographic },
  ]);
});

describe('syncDataCategories', () => {
  it('skips update rows with no id and reports per-item errors when create and update are mixed', async () => {
    makeGraphQLRequest.mockImplementation(async (_client, document) => {
      if (document === CREATE_DATA_SUB_CATEGORY) {
        throw new Error('create failed');
      }
      return {};
    });

    const inputs = [
      { name: 'New', category: DataCategoryType.Demographic },
      { name: '', category: DataCategoryType.Demographic },
    ];

    const success = await syncDataCategories(client, inputs, { onError });

    expect(success).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to sync data category "New"'),
      'New',
    );
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('has no id after create'), '');
    expect(makeGraphQLRequest).not.toHaveBeenCalledWith(
      client,
      UPDATE_DATA_SUB_CATEGORIES,
      expect.anything(),
    );
  });

  it('updates when create succeeds and keys match the create response', async () => {
    makeGraphQLRequest.mockImplementation(async (_client, document) => {
      if (document === CREATE_DATA_SUB_CATEGORY) {
        return {
          createDataCategory: {
            dataCategory: { id: 'new-id', name: 'Fresh', category: DataCategoryType.Demographic },
          },
        };
      }
      return {};
    });

    const inputs = [{ name: 'Fresh', category: DataCategoryType.Demographic }];

    const success = await syncDataCategories(client, inputs, { onError });

    expect(success).toBe(true);
    expect(makeGraphQLRequest).toHaveBeenCalledWith(
      client,
      UPDATE_DATA_SUB_CATEGORIES,
      expect.objectContaining({
        variables: {
          input: {
            dataSubCategories: [{ id: 'new-id', description: undefined, attributes: undefined }],
          },
        },
      }),
    );
  });
});
