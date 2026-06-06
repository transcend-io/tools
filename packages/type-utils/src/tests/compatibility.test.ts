import * as t from 'io-ts';
import { describe, expect, it } from 'vitest';

import {
  apply,
  applyEnum,
  findAllWithRegex,
  fromEntries,
  getEntries,
  getValues,
  makeEnum,
  toJsonSchema,
  valuesOf,
  type ObjByString,
  type Optionalize,
  type Requirize,
} from '../index.js';

describe('monorepo compatibility helpers', () => {
  it('maps object values with apply', () => {
    const result = apply(
      {
        ready: 1,
        pending: 2,
      },
      (value, key, fullObj, index) => `${key}:${value}:${index}:${Object.keys(fullObj).length}`,
    );

    expect(result).toEqual({
      ready: 'ready:1:0:2',
      pending: 'pending:2:1:2',
    });
  });

  it('maps enum values with applyEnum', () => {
    const Example = makeEnum({
      Ready: 'READY',
      Pending: 'PENDING',
    });

    expect(applyEnum(Example, (value, key) => `${key}:${value}`)).toEqual({
      READY: 'READY:READY',
      PENDING: 'PENDING:PENDING',
    });
  });

  it('preserves key and value pairs with getEntries and fromEntries', () => {
    const input = {
      alpha: 1,
      beta: 2,
    } as const;

    const entries = getEntries(input);
    expect(entries).toEqual([
      ['alpha', 1],
      ['beta', 2],
    ]);
    expect(fromEntries(entries)).toEqual(input);
  });

  it('returns typed values from enum-like objects', () => {
    const Example = makeEnum({
      Ready: 'READY',
      Pending: 'PENDING',
    });

    expect(getValues(Example)).toEqual(['READY', 'PENDING']);
    expect(valuesOf(Example).is('READY')).toBe(true);
    expect(valuesOf(Example).is('INVALID')).toBe(false);
  });

  it('finds all regex matches and maps named groups', () => {
    const regex = {
      value: /@([a-z]+)/g,
      strict: /^@[a-z]+$/,
      matches: ['tag'] as const,
    };

    expect(findAllWithRegex(regex, 'hello @alpha and @beta')).toEqual([
      {
        fullMatch: '@alpha',
        tag: 'alpha',
        matchIndex: 6,
        isStrict: true,
      },
      {
        fullMatch: '@beta',
        tag: 'beta',
        matchIndex: 17,
        isStrict: true,
      },
    ]);
  });

  it('converts io-ts codecs to json schema', () => {
    const schema = toJsonSchema(
      t.intersection([
        t.type({
          id: t.string,
        }),
        t.partial({
          retries: t.number,
        }),
      ]),
      true,
      true,
    );

    expect(schema).toEqual({
      type: 'object',
      required: ['id', 'retries'],
      properties: {
        id: { type: 'string' },
        retries: { type: ['number', 'null'] },
      },
      additionalProperties: false,
    });
  });

  it('keeps commonly imported helper types assignable', () => {
    type Base = {
      id?: string;
      name: string;
      age?: number;
    };

    const objByString: ObjByString = {
      anything: 'goes',
      count: 2,
    };
    const optionalized: Optionalize<Base, 'name'> = {
      name: 'ready',
    };
    const requirized: Requirize<Base, 'id'> = {
      id: '123',
      name: 'ready',
    };

    expect(objByString.count).toBe(2);
    expect(optionalized.name).toBe('ready');
    expect(requirized.id).toBe('123');
  });
});
