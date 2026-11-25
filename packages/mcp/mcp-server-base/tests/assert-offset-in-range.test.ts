import { describe, it, expect } from 'vitest';

import { assertOffsetInRange } from '../src/tools/helpers.js';

/** A caller that has paged past the end of a thirteen-row catalog. */
const overshot = {
  subject: 'assessment group',
  offset: 500,
  totalCount: 13,
  appliedFilters: [],
};

describe('assertOffsetInRange', () => {
  it('rejects an offset that starts past the end', () => {
    expect(() => assertOffsetInRange(overshot)).toThrow('past the end');
  });

  it('carries the numbers the caller needs to correct itself', () => {
    try {
      assertOffsetInRange({ ...overshot, appliedFilters: ['text', 'ids'] });
      expect.unreachable('should have thrown');
    } catch (error) {
      const thrown = error as { code: string; details: Record<string, unknown>; message: string };
      expect(thrown.code).toBe('VALIDATION_ERROR');
      expect(thrown.details).toMatchObject({ offset: 500, totalCount: 13 });
      // Naming the filters separates "you overshot" from "you over-filtered".
      expect(thrown.message).toContain('text, ids');
      expect(thrown.message).toContain('below 13');
    }
  });

  it('leaves an empty first page alone', () => {
    // Offset 0 against nothing is a real "no matches" and belongs to
    // describeNoMatches, not to an error.
    expect(() => assertOffsetInRange({ ...overshot, offset: 0, totalCount: 0 })).not.toThrow();
  });

  it('tolerates an absent offset, since an unpaged call must never throw', () => {
    expect(() =>
      assertOffsetInRange({ ...overshot, offset: undefined, totalCount: 0 }),
    ).not.toThrow();
  });

  it('allows the last page', () => {
    expect(() => assertOffsetInRange({ ...overshot, offset: 12 })).not.toThrow();
  });
});
