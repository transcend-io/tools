import * as t from 'io-ts';
import type { JSONSchema7 } from 'json-schema';

/**
 * `io-ts` types compatible with JSON Schema.
 */
type MappableType =
  | t.NumberType
  | t.StringType
  | t.NullType
  | t.BooleanType
  | t.LiteralType<any>
  | t.KeyofType<any>
  | t.InterfaceType<any>
  | t.DictionaryType<any, any>
  | t.PartialType<any>
  | t.UnionType<any>
  | t.ArrayType<any>
  | t.TupleType<any>
  | t.IntersectionType<any>
  | t.RefinementType<any>;

/**
 * Convert an `io-ts` codec to a JSON Schema (v7).
 */
export const toJsonSchema = (
  rawType: any,
  strict = false,
  alwaysIncludeRequired = false,
): JSONSchema7 => {
  const type = rawType as MappableType;

  if (type._tag === 'StringType') {
    return { type: 'string' };
  }

  if (type._tag === 'NumberType') {
    return { type: 'number' };
  }

  if (type._tag === 'NullType') {
    return { type: 'null' };
  }

  if (type._tag === 'BooleanType') {
    return { type: 'boolean' };
  }

  if (type._tag === 'LiteralType') {
    return { const: type.value };
  }

  if (type._tag === 'KeyofType') {
    return { type: 'string', enum: Object.keys(type.keys) };
  }

  if (type._tag === 'UnionType') {
    return {
      anyOf: type.types.map((subtype: any) => toJsonSchema(subtype, strict, alwaysIncludeRequired)),
    };
  }

  if (type._tag === 'IntersectionType' && !alwaysIncludeRequired) {
    return {
      allOf: type.types.map((subtype: any) => toJsonSchema(subtype, strict, alwaysIncludeRequired)),
    };
  }

  if (type._tag === 'IntersectionType' && alwaysIncludeRequired) {
    const results = type.types.map((subtype: any) =>
      toJsonSchema(subtype, strict, alwaysIncludeRequired),
    );

    if (!results.every((result: any) => result.type === 'object')) {
      throw new Error('InterfaceType must have all children as type=object');
    }

    return {
      type: 'object',
      required: results.map((result: any) => result.required).flat(),
      properties: results.reduce(
        (accumulator: any, result: any) => ({ ...accumulator, ...result.properties }),
        {},
      ),
      ...(strict ? { additionalProperties: false } : {}),
    };
  }

  if (type._tag === 'InterfaceType') {
    return {
      type: 'object',
      required: Object.keys(type.props),
      properties: Object.fromEntries(
        Object.entries(type.props).map(([key, subtype]) => [
          key,
          toJsonSchema(subtype as t.Type<any>, strict, alwaysIncludeRequired),
        ]),
      ),
      ...(strict ? { additionalProperties: false } : {}),
    };
  }

  if (type._tag === 'DictionaryType') {
    return {
      type: 'object',
      additionalProperties: toJsonSchema(type.codomain, strict, alwaysIncludeRequired),
    };
  }

  if (type._tag === 'PartialType') {
    return {
      type: 'object',
      ...(alwaysIncludeRequired ? { required: Object.keys(type.props) } : {}),
      properties: Object.fromEntries(
        Object.entries(type.props).map(([key, subtype]) => {
          const result = toJsonSchema(subtype as t.Type<any>, strict, alwaysIncludeRequired);
          return [
            key,
            alwaysIncludeRequired && result.type
              ? {
                  ...result,
                  type: [result.type as any, 'null'],
                }
              : result,
          ];
        }),
      ),
      ...(strict ? { additionalProperties: false } : {}),
    };
  }

  if (type._tag === 'ArrayType') {
    return {
      type: 'array',
      items: toJsonSchema(type.type, strict, alwaysIncludeRequired),
    };
  }

  if (type._tag === 'TupleType') {
    return {
      type: 'array',
      items: type.types.map((subtype: any) => toJsonSchema(subtype, strict, alwaysIncludeRequired)),
    };
  }

  if (type._tag === 'RefinementType') {
    if (type.name === 'Int') {
      return { type: 'integer' };
    }

    return {
      ...toJsonSchema(type.type, strict, alwaysIncludeRequired),
      description: `Predicate: ${type.predicate.name || type.name}`,
    };
  }

  return unhandledType(type as never);
};

const unhandledType = (_shouldBeNever: never) => ({});
