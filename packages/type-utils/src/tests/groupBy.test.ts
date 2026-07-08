import { describe, expect, it } from 'vitest';

import { groupBy } from '../groupBy.js';

interface ExampleObj {
  /** An example property. */
  a: string;
}

describe('groupBy', () => {
  it('groups by a given key', () => {
    const expected = new Map<string, ExampleObj[]>();
    expected.set('foo', [{ a: 'foo' }, { a: 'foo' }]);
    expected.set('bar', [{ a: 'bar' }]);

    expect(groupBy([{ a: 'foo' }, { a: 'bar' }, { a: 'foo' }], ({ a }) => a)).toEqual(expected);
  });
});
