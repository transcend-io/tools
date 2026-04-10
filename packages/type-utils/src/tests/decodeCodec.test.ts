import * as t from 'io-ts';
import { describe, expect, it } from 'vitest';

import { decodeCodec } from '../codecTools/index.js';

describe('decodeCodec', () => {
  it('decodes a codec as expected', () => {
    const codec = t.type({
      str: t.string,
      num: t.number,
      headers: t.record(t.string, t.string),
    });
    const obj = {
      str: 'abcd',
      num: 123,
      headers: {
        yolo: 'one-life',
      },
    };

    expect(decodeCodec(codec, obj)).toEqual(obj);
  });

  it('throws an error when the input does not match the codec', () => {
    const codec = t.type({
      str: t.string,
      num: t.number,
      headers: t.record(t.string, t.string),
    });
    const obj = {
      str: 123,
      num: 123,
      headers: {
        yolo: 'one-life',
      },
    };

    expect(() => decodeCodec(codec, obj)).toThrowError(
      'Failed to decode codec: [\n  ".str expected type \'string\'"\n]',
    );
  });
});
