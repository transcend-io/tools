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
 * Options for converting an `io-ts` codec to JSON Schema.
 */
export interface ToJsonSchemaOptions {
  /**
   * Replace repeated enum schemas with local draft-07 `definitions` references
   * when doing so makes the serialized schema smaller.
   */
  useReferences?: boolean;
}

/**
 * A repeated enum schema that may be moved into `definitions`.
 */
interface EnumSchemaCandidate {
  /** Number of occurrences in the generated schema. */
  occurrences: number;
  /** Serialized schema used to identify structural matches. */
  serializedSchema: string;
  /** Generated enum schema. */
  schema: JSONSchema7;
}

/**
 * Convert an `io-ts` codec to a JSON Schema (v7).
 */
export const toJsonSchema = (
  rawType: any,
  strict = false,
  alwaysIncludeRequired = false,
  options: ToJsonSchemaOptions = {},
): JSONSchema7 => {
  const schema = convertToJsonSchema(rawType, strict, alwaysIncludeRequired);
  return options.useReferences ? addEnumReferences(schema) : schema;
};

/**
 * Recursively convert an `io-ts` codec to an inline JSON Schema.
 *
 * Keeping this pass reference-free is important because parent codecs inspect
 * and transform their generated child schemas.
 */
const convertToJsonSchema = (
  rawType: any,
  strict: boolean,
  alwaysIncludeRequired: boolean,
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
      anyOf: type.types.map((subtype: any) =>
        convertToJsonSchema(subtype, strict, alwaysIncludeRequired),
      ),
    };
  }

  if (type._tag === 'IntersectionType' && !alwaysIncludeRequired) {
    return {
      allOf: type.types.map((subtype: any) =>
        convertToJsonSchema(subtype, strict, alwaysIncludeRequired),
      ),
    };
  }

  if (type._tag === 'IntersectionType' && alwaysIncludeRequired) {
    const results = type.types.map((subtype: any) =>
      convertToJsonSchema(subtype, strict, alwaysIncludeRequired),
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
          convertToJsonSchema(subtype as t.Type<any>, strict, alwaysIncludeRequired),
        ]),
      ),
      ...(strict ? { additionalProperties: false } : {}),
    };
  }

  if (type._tag === 'DictionaryType') {
    return {
      type: 'object',
      additionalProperties: convertToJsonSchema(type.codomain, strict, alwaysIncludeRequired),
    };
  }

  if (type._tag === 'PartialType') {
    return {
      type: 'object',
      ...(alwaysIncludeRequired ? { required: Object.keys(type.props) } : {}),
      properties: Object.fromEntries(
        Object.entries(type.props).map(([key, subtype]) => {
          const result = convertToJsonSchema(subtype as t.Type<any>, strict, alwaysIncludeRequired);
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
      items: convertToJsonSchema(type.type, strict, alwaysIncludeRequired),
    };
  }

  if (type._tag === 'TupleType') {
    return {
      type: 'array',
      items: type.types.map((subtype: any) =>
        convertToJsonSchema(subtype, strict, alwaysIncludeRequired),
      ),
    };
  }

  if (type._tag === 'RefinementType') {
    if (type.name === 'Int') {
      return { type: 'integer' };
    }

    return {
      ...convertToJsonSchema(type.type, strict, alwaysIncludeRequired),
      description: `Predicate: ${type.predicate.name || type.name}`,
    };
  }

  return unhandledType(type as never);
};

/**
 * Move repeated enum schemas into local draft-07 definitions.
 *
 * @param schema - Fully generated inline schema
 * @returns A smaller equivalent schema when references are beneficial
 */
function addEnumReferences(schema: JSONSchema7): JSONSchema7 {
  const candidates = new Map<string, EnumSchemaCandidate>();
  collectEnumCandidates(schema, candidates);

  const definitions: Record<string, JSONSchema7> = {};
  const definitionNames = new Map<string, string>();

  for (const candidate of candidates.values()) {
    if (candidate.occurrences < 2) {
      continue;
    }

    const definitionName = buildDefinitionName(candidate, definitions);
    const reference = { $ref: `#/definitions/${definitionName}` };
    const inlineSize = candidate.serializedSchema.length * candidate.occurrences;
    const referencedSize =
      candidate.serializedSchema.length +
      JSON.stringify(definitionName).length +
      1 +
      JSON.stringify(reference).length * candidate.occurrences;

    if (referencedSize < inlineSize) {
      definitions[definitionName] = candidate.schema;
      definitionNames.set(candidate.serializedSchema, definitionName);
    }
  }

  if (definitionNames.size === 0) {
    return schema;
  }

  const referencedSchema = replaceEnumCandidates(schema, definitionNames) as JSONSchema7;
  const result = { ...referencedSchema, definitions };

  return JSON.stringify(result).length < JSON.stringify(schema).length ? result : schema;
}

/**
 * Collect generated schema objects that contain enum constraints.
 *
 * @param value - Current generated schema value
 * @param candidates - Candidates indexed by their serialized structure
 */
function collectEnumCandidates(value: unknown, candidates: Map<string, EnumSchemaCandidate>): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectEnumCandidates(item, candidates));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  if (Array.isArray(value.enum)) {
    const serializedSchema = JSON.stringify(value);
    const candidate = candidates.get(serializedSchema);

    if (candidate) {
      candidate.occurrences += 1;
    } else {
      candidates.set(serializedSchema, {
        occurrences: 1,
        serializedSchema,
        schema: value as JSONSchema7,
      });
    }
  }

  Object.values(value).forEach((child) => collectEnumCandidates(child, candidates));
}

/**
 * Replace selected enum schemas with references.
 *
 * @param value - Current generated schema value
 * @param definitionNames - Definition names indexed by serialized schema
 * @returns A copy with selected enum schemas replaced
 */
function replaceEnumCandidates(value: unknown, definitionNames: Map<string, string>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => replaceEnumCandidates(item, definitionNames));
  }

  if (!isRecord(value)) {
    return value;
  }

  if (Array.isArray(value.enum)) {
    const definitionName = definitionNames.get(JSON.stringify(value));
    if (definitionName) {
      return { $ref: `#/definitions/${definitionName}` };
    }
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      replaceEnumCandidates(child, definitionNames),
    ]),
  );
}

/**
 * Build a stable, JSON Pointer-safe definition name.
 *
 * @param candidate - Enum schema being named
 * @param definitions - Existing definitions used to resolve hash collisions
 * @returns Definition name
 */
function buildDefinitionName(
  candidate: EnumSchemaCandidate,
  definitions: Record<string, JSONSchema7>,
): string {
  const enumSize = candidate.schema.enum?.length ?? 0;
  const baseName = `enum-${enumSize}-${hashString(candidate.serializedSchema)}`;
  let definitionName = baseName;
  let suffix = 2;

  while (
    definitions[definitionName] &&
    JSON.stringify(definitions[definitionName]) !== candidate.serializedSchema
  ) {
    definitionName = `${baseName}-${suffix}`;
    suffix += 1;
  }

  return definitionName;
}

/**
 * Produce a compact deterministic hash for a definition name.
 *
 * Hash collisions cannot affect correctness because definition names are
 * checked against their serialized schemas before use.
 *
 * @param value - Value to hash
 * @returns Unsigned base-36 FNV-1a hash
 */
function hashString(value: string): string {
  let hash = 2_166_136_261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return (hash >>> 0).toString(36);
}

/**
 * Check whether a value is a non-null object record.
 *
 * @param value - Value to check
 * @returns Whether the value is a record
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const unhandledType = (_shouldBeNever: never) => ({});
