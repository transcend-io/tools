import { describe, expect, it } from 'vitest';

import { createEnum } from '../enum.js';

describe('createEnum', () => {
  const enumValue = createEnum({
    my: 'my',
    property: 'property',
  });

  it('indexes a property that exists', () => {
    expect(enumValue.my).toBe('my');
    expect(enumValue.property).toBe('property');
  });

  it('allows iteration over keys', () => {
    expect(Object.keys(enumValue)).toEqual(['my', 'property']);
  });

  it('allows iteration over values', () => {
    expect(Object.values(enumValue)).toEqual(['my', 'property']);
  });
});
