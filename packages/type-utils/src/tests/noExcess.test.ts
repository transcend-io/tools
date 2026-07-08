import * as t from 'io-ts';
import { describe, expect, it } from 'vitest';

import { decodeCodec } from '../codecTools/index.js';
import { noExcess } from '../noExcess.js';

describe('noExcess', () => {
  it('decodes a wrapped codec as expected', () => {
    const codec = noExcess(
      t.type({
        str: t.string,
        num: t.number,
        headers: t.record(t.string, t.string),
      }),
    );

    const obj = {
      str: 'abcd',
      num: 123,
      headers: {
        yolo: 'one-life',
      },
    };

    expect(decodeCodec(codec, obj)).toEqual(obj);
  });

  it('does not throw when an unwrapped codec has an excess key', () => {
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
      extraKey: 'extraValue',
    };

    expect(decodeCodec(codec, obj)).toEqual(obj);
  });

  it('throws when a noExcess-wrapped codec has an excess key', () => {
    const codec = noExcess(
      t.type({
        str: t.string,
        num: t.number,
        headers: t.record(t.string, t.string),
      }),
    );

    const obj = {
      str: 'abcd',
      num: 123,
      headers: {
        yolo: 'one-life',
      },
      extraKey: 'extraValue',
    };

    expect(() => decodeCodec(codec, obj)).toThrowError(
      'Failed to decode codec: [\n  " expected type \'{| str: string, num: number, headers: { [K in string]: string } |}\'"\n]',
    );
  });
});
