import { describe, it, expect } from 'vitest';

import { z } from '../src/validation/index.js';
import { isoDate, nonEmptyList, nonEmptyListMessage } from '../src/validation/schemas.js';

describe('nonEmptyList', () => {
  it('rejects [] instead of reading it as no filter', () => {
    // Empty arrays are dropped during filter assembly, so a caller that
    // resolved a lookup to nothing would otherwise get the whole organization
    // back — the widest possible answer to a query that should match none.
    const result = nonEmptyList('Owner IDs').safeParse([]);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Pass at least one value, or omit the filter entirely.',
    );
  });

  it('names the element in the error when given a subject', () => {
    expect(
      nonEmptyList('Template IDs', 'template ID').safeParse([]).error?.issues[0]?.message,
    ).toBe('Pass at least one template ID, or omit the filter entirely.');
  });

  it('stays optional, so omitting the filter is still valid', () => {
    expect(nonEmptyList('Owner IDs').safeParse(undefined).success).toBe(true);
    expect(nonEmptyList('Owner IDs').safeParse(['u1']).success).toBe(true);
  });

  it('carries the description into the schema for the model to read', () => {
    expect(nonEmptyList('Owner IDs').description).toBe('Owner IDs');
  });
});

describe('nonEmptyListMessage', () => {
  it('gives enum arrays the same wording without the string element type', () => {
    const statuses = z
      .array(z.enum(['DRAFT', 'PUBLISHED']))
      .min(1, { message: nonEmptyListMessage('status') })
      .optional();

    expect(statuses.safeParse([]).error?.issues[0]?.message).toBe(
      'Pass at least one status, or omit the filter entirely.',
    );
  });
});

describe('isoDate', () => {
  it('accepts a bare date and a full timestamp', () => {
    expect(isoDate('createdAfter').safeParse('2026-01-31').success).toBe(true);
    expect(isoDate('createdAfter').safeParse('2026-01-31T09:30:00Z').success).toBe(true);
    expect(isoDate('createdAfter').safeParse('2026-01-31 09:30').success).toBe(true);
  });

  it('rejects prose and names the parameter that was wrong', () => {
    const result = isoDate('dueBefore').safeParse('last friday');

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('dueBefore must be an ISO 8601 date');
  });

  it('stays undescribed so each caller can say which side of the range it is', () => {
    // The bound's meaning is inclusive on one end and exclusive on the other
    // depending on the tool, so the shared helper must not claim either.
    expect(isoDate('createdAfter').description).toBeUndefined();
  });
});
