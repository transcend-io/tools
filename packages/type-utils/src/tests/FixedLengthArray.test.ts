import * as t from 'io-ts';
import { describe, expect, it } from 'vitest';

import { decodeCodec, FixedLengthArray } from '../codecTools/index.js';

describe('FixedLengthArray', () => {
  const twoItemArray = FixedLengthArray(2, 2, t.number);

  it('decodes a fixed length array successfully', () => {
    expect(() => decodeCodec(twoItemArray, [1, 2])).not.toThrow();
  });

  it('errors if the array does not have the expected length', () => {
    expect(() => decodeCodec(twoItemArray, [1, 2, 3])).toThrow();
  });
});
