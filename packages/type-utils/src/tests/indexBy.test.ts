import { describe, expect, it } from 'vitest';

import { indexBy } from '../indexBy.js';

interface ExampleObj {
  /** An example property. */
  a: string;
}

describe('indexBy', () => {
  it('indexes by a given key', () => {
    expect(indexBy([{ a: 'foo' }, { a: 'bar' }], ({ a }) => a)).toEqual({
      foo: { a: 'foo' },
      bar: { a: 'bar' },
    });
  });
});
