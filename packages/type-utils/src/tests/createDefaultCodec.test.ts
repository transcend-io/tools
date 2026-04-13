import * as t from 'io-ts';
import { describe, expect, it } from 'vitest';

import { createDefaultCodec } from '../codecTools/index.js';

describe('createDefaultCodec', () => {
  it('builds primitive defaults', () => {
    expect(createDefaultCodec(t.null)).toBeNull();
    expect(createDefaultCodec(t.number)).toBe(0);
    expect(createDefaultCodec(t.boolean)).toBe(false);
    expect(createDefaultCodec(t.undefined)).toBeUndefined();
    expect(createDefaultCodec(t.string)).toBe('');
  });

  it('builds a default for a union of literals', () => {
    const codec = t.union([t.literal('A'), t.literal('B')]);
    expect(createDefaultCodec(codec)).toBe('A');
  });

  it('builds a default for t.object', () => {
    expect(createDefaultCodec(t.object)).toEqual({});
  });

  it('prefers null in a union containing null', () => {
    expect(createDefaultCodec(t.union([t.string, t.null]))).toBeNull();
  });

  it('prefers an object branch when a union contains one', () => {
    const codec = t.union([t.string, t.null, t.type({ name: t.string })]);
    expect(createDefaultCodec(codec)).toEqual({ name: '' });
  });

  it('prefers an array branch when a union contains one', () => {
    const codec = t.union([t.string, t.null, t.type({ name: t.string }), t.array(t.string)]);

    expect(createDefaultCodec(codec)).toEqual([]);
  });

  it('creates an array with a default object for arrays of objects', () => {
    const codec = t.union([
      t.string,
      t.null,
      t.type({ name: t.string }),
      t.array(t.type({ age: t.number })),
    ]);

    expect(createDefaultCodec(codec)).toEqual([{ age: 0 }]);
  });

  it('falls back to the first branch when no higher-priority union branch exists', () => {
    expect(createDefaultCodec(t.union([t.string, t.number]))).toBe('');
  });

  it('creates defaults for arrays of object types', () => {
    expect(createDefaultCodec(t.array(t.type({ name: t.string, age: t.number })))).toEqual([
      { name: '', age: 0 },
    ]);
  });

  it('creates defaults for arrays of partial types', () => {
    expect(createDefaultCodec(t.array(t.partial({ name: t.string, age: t.number })))).toEqual([
      { name: '', age: 0 },
    ]);
  });

  it('creates defaults for arrays of intersections', () => {
    expect(
      createDefaultCodec(
        t.array(
          t.intersection([
            t.partial({ name: t.string, age: t.number }),
            t.type({ city: t.string }),
          ]),
        ),
      ),
    ).toEqual([{ name: '', age: 0, city: '' }]);
  });

  it('creates defaults for arrays of strings', () => {
    expect(createDefaultCodec(t.array(t.string))).toEqual([]);
  });

  it('creates defaults for intersections', () => {
    expect(
      createDefaultCodec(
        t.intersection([t.type({ id: t.string, name: t.string }), t.partial({ age: t.number })]),
      ),
    ).toEqual({ id: '', name: '', age: 0 });
  });
});
