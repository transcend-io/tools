import { describe, expect, it } from 'vitest';

import { flattenObject } from '../flattenObject.js';

describe('flattenObject', () => {
  it('returns an empty object for null input', () => {
    expect(flattenObject({ obj: null })).toEqual({});
  });

  it('returns an empty object for undefined input', () => {
    const obj = undefined;
    expect(flattenObject({ obj })).toEqual({});
  });

  it('flattens a list of objects with missing properties', () => {
    const obj = {
      users: [{ name: 'Bob' }, { name: 'Alice', age: 18 }],
    };

    expect(flattenObject({ obj })).toEqual({
      users_name: 'Bob,Alice',
      users_age: ',18',
    });
  });

  it('ignores primitive and null types within lists containing objects', () => {
    const obj = {
      users: ['example@domain.com', null, { name: 'Bob' }, { name: 'Alice', age: 18 }],
    };

    expect(flattenObject({ obj })).toEqual({
      users_name: 'Bob,Alice',
      users_age: ',18',
    });
  });

  it('flattens an object with null entries', () => {
    const obj = {
      user: {
        siblings: null,
      },
    };

    expect(flattenObject({ obj })).toEqual({
      user_siblings: '',
    });
  });

  it('flattens an object with empty entries', () => {
    const obj = {
      user: {
        siblings: [],
      },
    };

    expect(flattenObject({ obj })).toEqual({
      user_siblings: '',
    });
  });

  it('flattens a deeply nested object', () => {
    const obj = {
      user: {
        name: 'John',
        address: {
          city: 'NY',
          zip: 10001,
        },
        hobbies: ['reading', 'gaming'],
        parents: [
          {
            name: 'Alice',
            biological: true,
            age: 52,
          },
          {
            name: 'Bob',
            biological: false,
          },
        ],
        siblings: [],
        grandParents: null,
      },
    };

    expect(flattenObject({ obj })).toEqual({
      user_name: 'John',
      user_address_city: 'NY',
      user_address_zip: 10001,
      user_hobbies: 'reading,gaming',
      user_parents_name: 'Alice,Bob',
      user_parents_biological: 'true,false',
      user_parents_age: '52,',
      user_siblings: '',
      user_grandParents: '',
    });
  });
});
