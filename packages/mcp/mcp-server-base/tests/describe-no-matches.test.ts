import { describe, it, expect } from 'vitest';

import { createListResult, describeNoMatches } from '../src/tools/helpers.js';

describe('describeNoMatches', () => {
  it('names the filters the caller passed, so a zero can be narrowed', () => {
    const note = describeNoMatches('templates', ['text', 'statuses']);

    expect(note).toContain('text, statuses');
    expect(note).toContain('query succeeded');
  });

  it('tells the caller to change the query rather than repeat it', () => {
    // A cold-read agent that cannot tell an empty page from a broken filter
    // retries the same call, or spends an unfiltered one re-deriving the zero.
    expect(describeNoMatches('data silos', ['text'])).toContain('rather than retrying it');
  });

  it('distinguishes an empty organization from an over-narrow filter', () => {
    const note = describeNoMatches('assessment groups', []);

    expect(note).toBe('This organization has no assessment groups. The query succeeded.');
  });

  it('rides along on the empty page that createListResult builds', () => {
    const result = createListResult([], {
      totalCount: 0,
      hasNextPage: false,
      paginationNote: describeNoMatches('vendors', ['text']),
    }) as { count: number; paginationNote: string };

    expect(result.count).toBe(0);
    expect(result.paginationNote).toContain('No vendors match');
  });
});
