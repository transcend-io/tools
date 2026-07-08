import { describe, expect, it } from 'vitest';

import { invert, invertSafe } from '../invert.js';

describe('invert', () => {
  it('inverts a string -> string object', () => {
    expect(
      invert({
        a: 'b',
        c: 'd',
        e: 'f',
      }),
    ).toEqual({
      b: 'a',
      d: 'c',
      f: 'e',
    });
  });

  it('throws an error when a 1-1 invert is impossible', () => {
    expect(() =>
      invert({
        a: 'b',
        c: 'b',
        e: 'f',
      }),
    ).toThrowError('Encountered duplicate value inverting object: "b: c and a"');
  });

  it('inverts a string -> string[] object', () => {
    expect(
      invert({
        a: ['b', 'd'],
        c: ['d', 'e'],
        e: ['f'],
      }),
    ).toEqual({
      b: ['a'],
      d: ['a', 'c'],
      e: ['c'],
      f: ['e'],
    });
  });
});

describe('invertSafe', () => {
  it('inverts values into arrays of keys', () => {
    expect(
      invertSafe({
        a: 'b',
        c: 'd',
        e: 'f',
      }),
    ).toEqual({
      b: ['a'],
      d: ['c'],
      f: ['e'],
    });
  });
});
