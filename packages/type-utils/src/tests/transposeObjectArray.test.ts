import { describe, expect, it } from 'vitest';

import { transposeObjectArray } from '../transposeObjectArray.js';

describe('transposeObjectArray', () => {
  it('handles an empty array', () => {
    expect(
      transposeObjectArray({
        objects: [],
        properties: ['id', 'name'],
      }),
    ).toEqual({});
  });

  it('extracts multiple properties from an array of objects', () => {
    const objects = [
      { id: 1, name: 'John', age: 25, city: 'NY' },
      { id: 2, name: 'Jane', age: 30, city: 'LA' },
    ];

    expect(
      transposeObjectArray({
        objects,
        properties: ['id', 'name'],
      }),
    ).toEqual({
      id: [1, 2],
      name: ['John', 'Jane'],
      rest: [
        { age: 25, city: 'NY' },
        { age: 30, city: 'LA' },
      ],
    });
  });

  it('handles objects with missing properties', () => {
    const objects = [
      { id: 1, name: 'John', age: 25 },
      { id: 2, age: 30 },
      { id: 3, name: 'Bob', city: 'LA' },
    ];

    expect(
      transposeObjectArray({
        objects,
        properties: ['id', 'name'],
      }),
    ).toEqual({
      id: [1, 2, 3],
      name: ['John', undefined, 'Bob'],
      rest: [{ age: 25 }, { age: 30 }, { city: 'LA' }],
    });
  });

  it('handles different value types', () => {
    const objects = [
      { id: 1, active: true, count: 10, tags: ['a', 'b'] },
      { id: 2, active: false, count: 20, tags: ['c'] },
    ];

    expect(
      transposeObjectArray({
        objects,
        properties: ['active', 'tags'],
      }),
    ).toEqual({
      active: [true, false],
      tags: [['a', 'b'], ['c']],
      rest: [
        { id: 1, count: 10 },
        { id: 2, count: 20 },
      ],
    });
  });

  it('handles extracting all properties', () => {
    const objects = [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ];

    expect(
      transposeObjectArray({
        objects,
        properties: ['id', 'name'],
      }),
    ).toEqual({
      id: [1, 2],
      name: ['John', 'Jane'],
      rest: [{}, {}],
    });
  });

  it('handles extracting no properties', () => {
    const objects = [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ];

    expect(transposeObjectArray({ objects, properties: [] })).toEqual({
      rest: [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ],
    });
  });

  it('handles objects with nullish values', () => {
    const objects = [
      { id: 1, name: null, age: 25 },
      { id: 2, name: undefined, age: 30 },
    ];

    expect(
      transposeObjectArray({
        objects,
        properties: ['id', 'name'],
      }),
    ).toEqual({
      id: [1, 2],
      name: [null, undefined],
      rest: [{ age: 25 }, { age: 30 }],
    });
  });

  it('handles nested objects', () => {
    const objects = [
      { id: 1, user: { name: 'John', age: 25 } },
      { id: 2, user: { name: 'Jane', age: 30 } },
    ];

    expect(
      transposeObjectArray({
        objects,
        properties: ['id', 'user'],
      }),
    ).toEqual({
      id: [1, 2],
      user: [
        { name: 'John', age: 25 },
        { name: 'Jane', age: 30 },
      ],
      rest: [{}, {}],
    });
  });

  it('preserves property order in rest objects', () => {
    const objects = [
      { a: 1, b: 2, c: 3, d: 4 },
      { a: 5, b: 6, c: 7, d: 8 },
    ];

    expect(transposeObjectArray({ objects, properties: ['a', 'c'] })).toEqual({
      a: [1, 5],
      c: [3, 7],
      rest: [
        { b: 2, d: 4 },
        { b: 6, d: 8 },
      ],
    });
  });

  it('omits rest properties when includeOtherProperties is false', () => {
    const objects = [
      { id: 1, name: null, age: 25 },
      { id: 2, name: undefined, age: 30 },
    ];

    expect(
      transposeObjectArray({
        objects,
        properties: ['id', 'name'],
        options: { includeOtherProperties: false },
      }),
    ).toEqual({
      id: [1, 2],
      name: [null, undefined],
    });
  });
});
