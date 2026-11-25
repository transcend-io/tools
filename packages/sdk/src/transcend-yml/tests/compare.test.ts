import { describe, expect, it } from 'vitest';

import {
  canonicalString,
  compareObjects,
  isPlainObject,
  normalizeEmpty,
} from '../preview/compare.js';
import { PreviewFieldChangeKind } from '../preview/enums.js';

describe('isPlainObject', () => {
  it('returns true for plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it('returns false for null, arrays, and primitives', () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject('x')).toBe(false);
    expect(isPlainObject(0)).toBe(false);
  });
});

describe('normalizeEmpty', () => {
  it('maps nullish and empty strings to undefined', () => {
    expect(normalizeEmpty(null)).toBeUndefined();
    expect(normalizeEmpty(undefined)).toBeUndefined();
    expect(normalizeEmpty('')).toBeUndefined();
  });

  it('maps empty arrays and objects to undefined', () => {
    expect(normalizeEmpty([])).toBeUndefined();
    expect(normalizeEmpty({})).toBeUndefined();
  });

  it('keeps non-empty values', () => {
    expect(normalizeEmpty('hi')).toBe('hi');
    expect(normalizeEmpty([1])).toEqual([1]);
    expect(normalizeEmpty({ a: 1 })).toEqual({ a: 1 });
  });
});

describe('canonicalString', () => {
  it('sorts object keys for stable comparison', () => {
    expect(canonicalString({ b: 1, a: 2 })).toBe(canonicalString({ a: 2, b: 1 }));
  });

  it('sorts unordered list values', () => {
    expect(canonicalString(['b', 'a'])).toBe(canonicalString(['a', 'b']));
  });

  it('preserves order when ordered is true', () => {
    expect(canonicalString(['b', 'a'], true)).not.toBe(canonicalString(['a', 'b'], true));
  });

  it('omits empty nested values', () => {
    expect(canonicalString({ a: '', b: 1 })).toBe(canonicalString({ b: 1 }));
  });
});

describe('compareObjects', () => {
  it('reports changed scalar fields', () => {
    const { fields } = compareObjects({ name: 'new' }, { name: 'old' }, {});
    expect(fields).toEqual([
      {
        path: 'name',
        before: 'old',
        after: 'new',
        kind: PreviewFieldChangeKind.Changed,
      },
    ]);
  });

  it('skips ignored and empty local fields', () => {
    const { fields } = compareObjects(
      { a: 1, skip: 'x', empty: '' },
      { skip: 'y' },
      {
        ignoreFields: ['skip'],
      },
    );
    expect(fields).toEqual([
      {
        path: 'a',
        before: undefined,
        after: 1,
        kind: PreviewFieldChangeKind.Changed,
      },
    ]);
  });

  it('collects write-only fields without diffs', () => {
    const { fields, writeOnly } = compareObjects(
      { secret: 'new' },
      { secret: 'old' },
      { writeOnlyFields: ['secret'] },
    );
    expect(fields).toEqual([]);
    expect(writeOnly).toEqual(['secret']);
  });

  it('matches nested list items by identity and reports additions', () => {
    const { fields } = compareObjects(
      {
        items: [
          { key: 'a', value: 1 },
          { key: 'b', value: 2 },
        ],
      },
      { items: [{ key: 'a', value: 1 }] },
      { nested: { items: { identity: (item) => String(item.key) } } },
    );
    expect(fields).toEqual([
      {
        path: 'items[b]',
        before: undefined,
        after: { key: 'b', value: 2 },
        kind: PreviewFieldChangeKind.Added,
      },
    ]);
  });

  it('diffs matched nested list items', () => {
    const { fields } = compareObjects(
      { items: [{ key: 'a', value: 2 }] },
      { items: [{ key: 'a', value: 1 }] },
      { nested: { items: { identity: (item) => String(item.key) } } },
    );
    expect(fields[0]).toMatchObject({
      path: 'items[a].value',
      kind: PreviewFieldChangeKind.Changed,
    });
  });

  it('compares unordered string lists as sets', () => {
    const { fields } = compareObjects(
      { tags: ['b', 'a'] },
      { tags: ['a', 'b'] },
      { orderedFields: [] },
    );
    expect(fields).toEqual([]);
  });
});
