import {
  derivePageInfo,
  toolInputSchema,
  TranscendRestClient,
  type AuthCredentials,
} from '@transcend-io/mcp-server-base';
import { describe, expect, it } from 'vitest';

import { TranscendGraphQLClient } from '../src/graphql-client.js';
import { ToolRegistry } from '../src/registry.js';

const TEST_AUTH: AuthCredentials = { type: 'apiKey', apiKey: 'test-key' };

/**
 * `preferences_query` pages a REST endpoint that caps a page at 50 rather than
 * the 100 every GraphQL list field allows, so it keeps the shared `limit` and
 * `cursor` names but not the shared bound.
 */
const NON_STANDARD_LIMIT_BOUND = new Set(['preferences_query']);

interface JsonSchema {
  properties?: Record<string, { type?: string; minimum?: number; maximum?: number }>;
}

function paginatedTools() {
  const registry = new ToolRegistry({
    rest: new TranscendRestClient(TEST_AUTH, 'http://localhost:0'),
    graphql: new TranscendGraphQLClient(TEST_AUTH, 'http://localhost:0'),
    dashboardUrl: 'https://app.transcend.io',
  });

  return registry.getAllTools().flatMap((tool) => {
    const schema = toolInputSchema(tool.zodSchema) as JsonSchema;
    const properties = schema.properties ?? {};
    if (!('limit' in properties || 'offset' in properties || 'cursor' in properties)) {
      return [];
    }
    return [{ name: tool.name, description: tool.description, properties }];
  });
}

describe('pagination contract', () => {
  it('exposes only `limit` with `offset` or `cursor`, never GraphQL wire names', () => {
    const offenders = paginatedTools()
      .filter(({ properties }) => 'first' in properties || 'after' in properties)
      .map(({ name }) => name);

    expect(
      offenders,
      '`first`/`after` are the GraphQL argument names. Tools expose `limit` with `offset` ' +
        '(OffsetPaginationSchema) or `cursor` (CursorPaginationSchema).',
    ).toEqual([]);
  });

  it('pairs `limit` with a continuation parameter so every page is reachable', () => {
    const stranded = paginatedTools()
      .filter(({ properties }) => !('offset' in properties) && !('cursor' in properties))
      .map(({ name }) => name);

    expect(
      stranded,
      'these tools cap results with `limit` but expose no way to reach the next page, ' +
        'so a caller that sees hasNextPage=true is stuck',
    ).toEqual([]);
  });

  it('bounds `limit` identically everywhere', () => {
    const wrong = paginatedTools()
      .filter(({ name }) => !NON_STANDARD_LIMIT_BOUND.has(name))
      .filter(({ properties }) => {
        const limit = properties.limit;
        return !limit || limit.minimum !== 1 || limit.maximum !== 100;
      })
      .map(({ name }) => name);

    expect(wrong, 'every tool should inherit `limit` from the shared pagination schemas').toEqual(
      [],
    );
  });

  it('leaves paging mechanics to the schema instead of restating them in descriptions', () => {
    const chatty = paginatedTools()
      .filter(({ description }) =>
        /paginate with|increment by|max ~?100|page with `offset`/i.test(description),
      )
      .map(({ name }) => name);

    expect(
      chatty,
      'the `limit`/`offset` schema already carries bounds and defaults; repeating them in ' +
        'the description spends tools/list budget on every call',
    ).toEqual([]);
  });
});

describe('derivePageInfo', () => {
  it('reports another page while rows remain beyond this one', () => {
    expect(derivePageInfo({ offset: 0, nodeCount: 50, totalCount: 120 })).toEqual({
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it('terminates on the final short page', () => {
    // The bug this replaced compared nodeCount to totalCount alone, so 20 < 120
    // kept hasNextPage true forever and callers paged until they ran out of
    // context.
    expect(derivePageInfo({ offset: 100, nodeCount: 20, totalCount: 120 })).toEqual({
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('terminates on an exactly-full final page', () => {
    expect(derivePageInfo({ offset: 70, nodeCount: 50, totalCount: 120 })).toMatchObject({
      hasNextPage: false,
    });
  });

  it('reports no next page for an empty result set', () => {
    expect(derivePageInfo({ offset: 0, nodeCount: 0, totalCount: 0 })).toEqual({
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('does not promise more rows when offset runs past the end', () => {
    expect(derivePageInfo({ offset: 500, nodeCount: 0, totalCount: 120 })).toMatchObject({
      hasNextPage: false,
    });
  });
});
