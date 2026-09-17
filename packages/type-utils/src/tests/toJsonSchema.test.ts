import * as t from 'io-ts';
import type { JSONSchema7 } from 'json-schema';
import { describe, expect, it } from 'vitest';

import { toJsonSchema } from '../codecTools/toJsonSchema.js';

const largeEnumValues = [
  'a-value-long-enough-to-benefit-from-a-reference',
  'b-value-long-enough-to-benefit-from-a-reference',
  'c-value-long-enough-to-benefit-from-a-reference',
] as const;

const buildLargeEnum = () =>
  t.keyof(Object.fromEntries(largeEnumValues.map((value) => [value, null])));

describe('toJsonSchema', () => {
  it('keeps schemas inline by default', () => {
    const schema = toJsonSchema(
      t.type({
        first: buildLargeEnum(),
        second: buildLargeEnum(),
      }),
    );

    expect(schema).toEqual({
      type: 'object',
      required: ['first', 'second'],
      properties: {
        first: { type: 'string', enum: largeEnumValues },
        second: { type: 'string', enum: largeEnumValues },
      },
    });
  });

  it('references a reused named codec when references reduce the schema size', () => {
    const locale = t.keyof(
      Object.fromEntries(largeEnumValues.map((value) => [value, null])),
      'Locale',
    );
    const schema = toJsonSchema(
      t.type({
        first: locale,
        second: locale,
      }),
      false,
      false,
      { useReferences: true },
    );
    const definitions = schema.definitions as Record<string, JSONSchema7>;

    expect(definitions).toEqual({
      Locale: {
        type: 'string',
        enum: largeEnumValues,
      },
    });
    expect(schema.properties).toEqual({
      first: { $ref: '#/definitions/Locale' },
      second: { $ref: '#/definitions/Locale' },
    });
  });

  it('references reused composite codecs by identity', () => {
    const shared = t.type(
      {
        firstLongProperty: t.string,
        secondLongProperty: t.number,
        thirdLongProperty: t.boolean,
      },
      'SharedConfiguration',
    );
    const schema = toJsonSchema(
      t.type({
        first: shared,
        second: shared,
      }),
      false,
      false,
      { useReferences: true },
    );

    expect(schema.definitions).toEqual({
      SharedConfiguration: {
        type: 'object',
        required: ['firstLongProperty', 'secondLongProperty', 'thirdLongProperty'],
        properties: {
          firstLongProperty: { type: 'string' },
          secondLongProperty: { type: 'number' },
          thirdLongProperty: { type: 'boolean' },
        },
      },
    });
    expect(schema.properties).toEqual({
      first: { $ref: '#/definitions/SharedConfiguration' },
      second: { $ref: '#/definitions/SharedConfiguration' },
    });
  });

  it('inlines definitions that become unprofitable after nesting is considered', () => {
    const child = t.type(
      {
        firstLongProperty: t.string,
        secondLongProperty: t.number,
      },
      'ChildConfiguration',
    );
    const parent = t.type({ child }, 'ParentConfiguration');
    const schema = toJsonSchema(
      t.type({
        first: parent,
        second: parent,
      }),
      false,
      false,
      { useReferences: true },
    );

    expect(schema.definitions).toEqual({
      ParentConfiguration: {
        type: 'object',
        required: ['child'],
        properties: {
          child: {
            type: 'object',
            required: ['firstLongProperty', 'secondLongProperty'],
            properties: {
              firstLongProperty: { type: 'string' },
              secondLongProperty: { type: 'number' },
            },
          },
        },
      },
    });
    expect(schema.properties?.first).toEqual({
      $ref: '#/definitions/ParentConfiguration',
    });
  });

  it('does not conflate distinct codec objects with the same structure', () => {
    const schema = toJsonSchema(
      t.type({
        first: buildLargeEnum(),
        second: buildLargeEnum(),
      }),
      false,
      false,
      { useReferences: true },
    );

    expect(schema.definitions).toBeUndefined();
    expect(schema.properties).toEqual({
      first: {
        type: 'string',
        enum: largeEnumValues,
      },
      second: {
        type: 'string',
        enum: largeEnumValues,
      },
    });
  });

  it('does not reference codecs that occur once or would make the schema larger', () => {
    const shortEnum = t.keyof({ short: null, values: null });
    const schema = toJsonSchema(
      t.type({
        first: shortEnum,
        second: shortEnum,
        unique: buildLargeEnum(),
      }),
      false,
      false,
      { useReferences: true },
    );

    expect(schema.definitions).toBeUndefined();
    expect(schema.properties).toEqual({
      first: { type: 'string', enum: ['short', 'values'] },
      second: { type: 'string', enum: ['short', 'values'] },
      unique: { type: 'string', enum: largeEnumValues },
    });
  });

  it('preserves schema transformations applied by parent codecs before adding references', () => {
    const locale = t.keyof(
      Object.fromEntries(largeEnumValues.map((value) => [value, null])),
      'Locale',
    );
    const schema = toJsonSchema(
      t.partial({
        first: locale,
        second: locale,
      }),
      false,
      true,
      { useReferences: true },
    );
    const definitions = schema.definitions as Record<string, JSONSchema7>;

    expect(definitions.Locale).toEqual({
      type: ['string', 'null'],
      enum: largeEnumValues,
    });
    expect(schema.properties).toEqual({
      first: { $ref: '#/definitions/Locale' },
      second: { $ref: '#/definitions/Locale' },
    });
  });
});
