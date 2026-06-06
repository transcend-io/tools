import { describe, expect, it } from 'vitest';

import { aggregateObjects } from '../aggregateObjects.js';

describe('aggregateObjects', () => {
  it('returns an empty object for an empty input array', () => {
    expect(aggregateObjects({ objs: [] })).toEqual({});
  });

  it('aggregates objects with the same keys', () => {
    const objs = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
      { name: 'Bob', age: 35 },
    ];

    expect(aggregateObjects({ objs })).toEqual({
      name: 'John,Jane,Bob',
      age: '30,25,35',
    });
  });

  it('handles missing properties', () => {
    const objs = [{ name: 'John', age: 30 }, { name: 'Jane' }, { name: 'Bob', age: 35 }];

    expect(aggregateObjects({ objs })).toEqual({
      name: 'John,Jane,Bob',
      age: '30,,35',
    });
  });

  it('handles null and undefined values', () => {
    const objs = [
      { name: 'John', age: null },
      { name: undefined, hobby: 'reading' },
      { name: 'Bob', hobby: null },
    ];

    expect(aggregateObjects({ objs })).toEqual({
      name: 'John,,Bob',
      age: ',,',
      hobby: ',reading,',
    });
  });

  it('wraps values in brackets when requested', () => {
    const objs = [{ name: 'John', age: 30 }, { name: 'Jane' }, { name: 'Bob', age: 35 }];

    expect(aggregateObjects({ objs, wrap: true })).toEqual({
      name: '[John],[Jane],[Bob]',
      age: '[30],[],[35]',
    });
  });

  it('handles objects with different keys', () => {
    const objs = [
      { name: 'John', age: 30 },
      { city: 'NY', country: 'USA' },
      { name: 'Bob', country: 'UK' },
    ];

    expect(aggregateObjects({ objs })).toEqual({
      name: 'John,,Bob',
      age: '30,,',
      city: ',NY,',
      country: ',USA,UK',
    });
  });

  it('handles empty objects', () => {
    const objs = [{ name: 'John' }, {}, { name: 'Bob' }];

    expect(aggregateObjects({ objs })).toEqual({
      name: 'John,,Bob',
    });
  });

  it('handles nullish objects in the input array', () => {
    const objs = [{ name: 'John' }, null, undefined, { name: 'Bob' }];

    expect(aggregateObjects({ objs })).toEqual({
      name: 'John,,,Bob',
    });
  });

  it('handles numeric and boolean values', () => {
    const objs = [
      { count: 1, active: true },
      { count: 2, active: false },
      { count: 3, active: true },
    ];

    expect(aggregateObjects({ objs })).toEqual({
      count: '1,2,3',
      active: 'true,false,true',
    });
  });
});
