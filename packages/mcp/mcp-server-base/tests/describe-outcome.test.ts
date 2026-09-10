import { describe, it, expect } from 'vitest';

import { describeOutcome } from '../src/tools/helpers.js';

const note = (over: Partial<Parameters<typeof describeOutcome>[0]> = {}) =>
  describeOutcome({
    subject: 'data systems',
    returned: 50,
    totalCount: 269,
    offset: 0,
    limit: 50,
    appliedFilters: [],
    ...over,
  });

describe('describeOutcome', () => {
  it('hands back the offset to fetch next, so paging needs no arithmetic', () => {
    expect(note()).toBe('Showing 50 of 269 matches. Fetch the next page with offset 50.');
  });

  it('advances the offset by the page size, not by the rows returned', () => {
    // A short final-but-not-last page must not rewind the cursor.
    expect(note({ returned: 20, limit: 50, offset: 100 })).toContain('offset 150');
  });

  it('says a full result set is complete rather than leaving it open', () => {
    expect(note({ returned: 2, totalCount: 2 })).toBe('Showing all 2 matches. No further pages.');
  });

  it('does not say "1 matches"', () => {
    expect(note({ returned: 1, totalCount: 1 })).toBe('Showing all 1 match. No further pages.');
  });

  it('does not call a first page "the last" one', () => {
    // "the last 2 of 2" implies a page came before this one.
    expect(note({ returned: 2, totalCount: 2, offset: 0 })).not.toContain('the last');
    expect(note({ returned: 2, totalCount: 5, offset: 3 })).toContain('the last 2 of 5');
  });

  it('defers to describeNoMatches on zero, naming the filters', () => {
    const zero = note({ returned: 0, totalCount: 0, appliedFilters: ['unassignedOnly', 'types'] });

    expect(zero).toContain('unassignedOnly, types');
    expect(zero).toContain('query succeeded');
  });

  it('names the subject it was given, since it serves every list tool', () => {
    expect(note({ returned: 0, totalCount: 0, subject: 'assessment groups' })).toContain(
      'assessment groups',
    );
  });

  it('tolerates absent paging, because handlers are also called directly', () => {
    expect(note({ offset: undefined, limit: undefined, returned: 3, totalCount: 3 })).toBe(
      'Showing all 3 matches. No further pages.',
    );
  });
});
