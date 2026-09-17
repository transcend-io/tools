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

  it('references structurally identical enum codecs when references reduce the schema size', () => {
    const schema = toJsonSchema(
      t.type({
        first: buildLargeEnum(),
        second: buildLargeEnum(),
      }),
      false,
      false,
      { useReferences: true },
    );
    const definitions = schema.definitions as Record<string, JSONSchema7>;
    const definitionNames = Object.keys(definitions);

    expect(definitionNames).toHaveLength(1);
    expect(definitions[definitionNames[0]!]).toEqual({
      type: 'string',
      enum: largeEnumValues,
    });
    expect(schema.properties).toEqual({
      first: { $ref: `#/definitions/${definitionNames[0]}` },
      second: { $ref: `#/definitions/${definitionNames[0]}` },
    });
  });

  it('does not reference enums that occur once or would make the schema larger', () => {
    const schema = toJsonSchema(
      t.type({
        first: t.keyof({ short: null, values: null }),
        second: t.keyof({ short: null, values: null }),
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
    const schema = toJsonSchema(
      t.partial({
        first: buildLargeEnum(),
        second: buildLargeEnum(),
      }),
      false,
      true,
      { useReferences: true },
    );
    const definitions = schema.definitions as Record<string, JSONSchema7>;
    const definitionName = Object.keys(definitions)[0]!;

    expect(definitions[definitionName]).toEqual({
      type: ['string', 'null'],
      enum: largeEnumValues,
    });
    expect(schema.properties).toEqual({
      first: { $ref: `#/definitions/${definitionName}` },
      second: { $ref: `#/definitions/${definitionName}` },
    });
  });
});
