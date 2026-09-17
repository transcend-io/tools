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
   * Replace reused codecs with local draft-07 `definitions` references when
   * doing so makes the serialized schema smaller.
   */
  useReferences?: boolean;
}

/**
 * State shared while an `io-ts` codec graph is converted.
 */
interface ConversionContext {
  /** Codec identity associated with each generated schema object. */
  schemaCodecs: WeakMap<JSONSchema7, object>;
}

/**
 * A reused codec schema that may be moved into `definitions`.
 */
interface CodecSchemaCandidate {
  /** Codec object represented by the generated schemas. */
  codec: object;
  /** Number of occurrences in the generated schema. */
  occurrences: number;
  /** Generated schema objects representing this codec and schema variant. */
  schemas: JSONSchema7[];
  /** Serialized schema used to identify structural matches. */
  serializedSchema: string;
  /** Generated schema used as the definition body. */
  schema: JSONSchema7;
}

/**
 * Runtime metadata exposed by an `io-ts` codec.
 */
interface CodecMetadata {
  /** Human-readable codec name. */
  name?: unknown;
  /** Internal `io-ts` codec tag. */
  _tag?: unknown;
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
  const context: ConversionContext = {
    schemaCodecs: new WeakMap(),
  };
  const schema = convertToJsonSchema(rawType, strict, alwaysIncludeRequired, context);
  return options.useReferences ? addCodecReferences(schema, context) : schema;
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
  context: ConversionContext,
): JSONSchema7 => {
  const type = rawType as MappableType;
  const tracked = (schema: JSONSchema7): JSONSchema7 => trackSchema(type, schema, context);

  if (type._tag === 'StringType') {
    return tracked({ type: 'string' });
  }

  if (type._tag === 'NumberType') {
    return tracked({ type: 'number' });
  }

  if (type._tag === 'NullType') {
    return tracked({ type: 'null' });
  }

  if (type._tag === 'BooleanType') {
    return tracked({ type: 'boolean' });
  }

  if (type._tag === 'LiteralType') {
    return tracked({ const: type.value });
  }

  if (type._tag === 'KeyofType') {
    return tracked({ type: 'string', enum: Object.keys(type.keys) });
  }

  if (type._tag === 'UnionType') {
    return tracked({
      anyOf: type.types.map((subtype: any) =>
        convertToJsonSchema(subtype, strict, alwaysIncludeRequired, context),
      ),
    });
  }

  if (type._tag === 'IntersectionType' && !alwaysIncludeRequired) {
    return tracked({
      allOf: type.types.map((subtype: any) =>
        convertToJsonSchema(subtype, strict, alwaysIncludeRequired, context),
      ),
    });
  }

  if (type._tag === 'IntersectionType' && alwaysIncludeRequired) {
    const results = type.types.map((subtype: any) =>
      convertToJsonSchema(subtype, strict, alwaysIncludeRequired, context),
    );

    if (!results.every((result: any) => result.type === 'object')) {
      throw new Error('InterfaceType must have all children as type=object');
    }

    return tracked({
      type: 'object',
      required: results.map((result: any) => result.required).flat(),
      properties: results.reduce(
        (accumulator: any, result: any) => ({ ...accumulator, ...result.properties }),
        {},
      ),
      ...(strict ? { additionalProperties: false } : {}),
    });
  }

  if (type._tag === 'InterfaceType') {
    return tracked({
      type: 'object',
      required: Object.keys(type.props),
      properties: Object.fromEntries(
        Object.entries(type.props).map(([key, subtype]) => [
          key,
          convertToJsonSchema(subtype as t.Type<any>, strict, alwaysIncludeRequired, context),
        ]),
      ),
      ...(strict ? { additionalProperties: false } : {}),
    });
  }

  if (type._tag === 'DictionaryType') {
    return tracked({
      type: 'object',
      additionalProperties: convertToJsonSchema(
        type.codomain,
        strict,
        alwaysIncludeRequired,
        context,
      ),
    });
  }

  if (type._tag === 'PartialType') {
    return tracked({
      type: 'object',
      ...(alwaysIncludeRequired ? { required: Object.keys(type.props) } : {}),
      properties: Object.fromEntries(
        Object.entries(type.props).map(([key, subtype]) => {
          const result = convertToJsonSchema(
            subtype as t.Type<any>,
            strict,
            alwaysIncludeRequired,
            context,
          );
          const transformedResult =
            alwaysIncludeRequired && result.type
              ? trackSchema(
                  subtype as object,
                  {
                    ...result,
                    type: [result.type as any, 'null'],
                  },
                  context,
                )
              : result;
          return [key, transformedResult];
        }),
      ),
      ...(strict ? { additionalProperties: false } : {}),
    });
  }

  if (type._tag === 'ArrayType') {
    return tracked({
      type: 'array',
      items: convertToJsonSchema(type.type, strict, alwaysIncludeRequired, context),
    });
  }

  if (type._tag === 'TupleType') {
    return tracked({
      type: 'array',
      items: type.types.map((subtype: any) =>
        convertToJsonSchema(subtype, strict, alwaysIncludeRequired, context),
      ),
    });
  }

  if (type._tag === 'RefinementType') {
    if (type.name === 'Int') {
      return tracked({ type: 'integer' });
    }

    return tracked({
      ...convertToJsonSchema(type.type, strict, alwaysIncludeRequired, context),
      description: `Predicate: ${type.predicate.name || type.name}`,
    });
  }

  return tracked(unhandledType(type as never));
};

/**
 * Associate a generated schema object with the codec that produced it.
 *
 * @param codec - Source codec
 * @param schema - Generated schema
 * @param context - Shared conversion state
 * @returns The generated schema
 */
function trackSchema(codec: object, schema: JSONSchema7, context: ConversionContext): JSONSchema7 {
  context.schemaCodecs.set(schema, codec);
  return schema;
}

/**
 * Move schemas produced by reused codec objects into local draft-07
 * definitions.
 *
 * @param schema - Fully generated inline schema
 * @param context - Shared conversion state
 * @returns A smaller equivalent schema when references are beneficial
 */
function addCodecReferences(schema: JSONSchema7, context: ConversionContext): JSONSchema7 {
  const candidates = new Map<object, Map<string, CodecSchemaCandidate>>();
  collectCodecCandidates(schema, context, candidates);

  const definitionNames = new WeakMap<JSONSchema7, string>();
  const selectedCandidates = new Map<string, CodecSchemaCandidate>();
  const usedDefinitionNames = new Set<string>();

  for (const variants of candidates.values()) {
    for (const candidate of variants.values()) {
      if (candidate.occurrences < 2) {
        continue;
      }

      const definitionName = buildDefinitionName(candidate, usedDefinitionNames);
      const reference = { $ref: `#/definitions/${definitionName}` };
      const inlineSize = candidate.serializedSchema.length * candidate.occurrences;
      const referencedSize =
        candidate.serializedSchema.length +
        JSON.stringify(definitionName).length +
        1 +
        JSON.stringify(reference).length * candidate.occurrences;

      if (referencedSize < inlineSize) {
        usedDefinitionNames.add(definitionName);
        selectedCandidates.set(definitionName, candidate);
        candidate.schemas.forEach((candidateSchema) =>
          definitionNames.set(candidateSchema, definitionName),
        );
      }
    }
  }

  if (selectedCandidates.size === 0) {
    return schema;
  }

  const definitions: Record<string, JSONSchema7> = {};
  const referencedSchema = replaceCodecCandidates(
    schema,
    definitionNames,
    selectedCandidates,
    definitions,
  ) as JSONSchema7;
  const result = inlineUnprofitableDefinitions(referencedSchema, definitions);

  return JSON.stringify(result).length < JSON.stringify(schema).length ? result : schema;
}

/**
 * Collect schema variants by the identity of the codec that produced them.
 *
 * A codec can produce different schemas in different parent contexts, so its
 * serialized schema is a secondary key.
 *
 * @param value - Current generated schema value
 * @param context - Shared conversion state
 * @param candidates - Candidates grouped by codec identity and schema variant
 */
function collectCodecCandidates(
  value: unknown,
  context: ConversionContext,
  candidates: Map<object, Map<string, CodecSchemaCandidate>>,
): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectCodecCandidates(item, context, candidates));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const schema = value as JSONSchema7;
  const codec = context.schemaCodecs.get(schema);

  if (codec) {
    const serializedSchema = JSON.stringify(schema);
    const variants = candidates.get(codec) ?? new Map<string, CodecSchemaCandidate>();
    const candidate = variants.get(serializedSchema);

    if (candidate) {
      candidate.occurrences += 1;
      candidate.schemas.push(schema);
    } else {
      variants.set(serializedSchema, {
        codec,
        occurrences: 1,
        schemas: [schema],
        serializedSchema,
        schema,
      });
      candidates.set(codec, variants);
    }
  }

  Object.values(value).forEach((child) => collectCodecCandidates(child, context, candidates));
}

/**
 * Replace selected codec schemas with references, creating definitions lazily
 * so unused nested candidates are omitted.
 *
 * @param value - Current generated schema value
 * @param definitionNames - Definition name for each selected schema object
 * @param selectedCandidates - Selected candidates indexed by definition name
 * @param definitions - Definitions created while replacing candidates
 * @returns A copy with selected codec schemas replaced
 */
function replaceCodecCandidates(
  value: unknown,
  definitionNames: WeakMap<JSONSchema7, string>,
  selectedCandidates: Map<string, CodecSchemaCandidate>,
  definitions: Record<string, JSONSchema7>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      replaceCodecCandidates(item, definitionNames, selectedCandidates, definitions),
    );
  }

  if (!isRecord(value)) {
    return value;
  }

  const definitionName = definitionNames.get(value as JSONSchema7);
  if (definitionName) {
    ensureDefinition(definitionName, definitionNames, selectedCandidates, definitions);
    return { $ref: `#/definitions/${definitionName}` };
  }

  return replaceSchemaChildren(value, definitionNames, selectedCandidates, definitions);
}

/**
 * Create a selected definition and replace any nested selected codecs.
 *
 * @param definitionName - Definition to create
 * @param definitionNames - Definition name for each selected schema object
 * @param selectedCandidates - Selected candidates indexed by definition name
 * @param definitions - Definitions created while replacing candidates
 */
function ensureDefinition(
  definitionName: string,
  definitionNames: WeakMap<JSONSchema7, string>,
  selectedCandidates: Map<string, CodecSchemaCandidate>,
  definitions: Record<string, JSONSchema7>,
): void {
  if (Object.hasOwn(definitions, definitionName)) {
    return;
  }

  definitions[definitionName] = {};
  const candidate = selectedCandidates.get(definitionName)!;
  definitions[definitionName] = replaceSchemaChildren(
    candidate.schema,
    definitionNames,
    selectedCandidates,
    definitions,
  ) as JSONSchema7;
}

/**
 * Replace selected codecs below a schema object without replacing the object
 * itself.
 *
 * @param schema - Schema whose children should be replaced
 * @param definitionNames - Definition name for each selected schema object
 * @param selectedCandidates - Selected candidates indexed by definition name
 * @param definitions - Definitions created while replacing candidates
 * @returns Schema object with replaced children
 */
function replaceSchemaChildren(
  schema: object,
  definitionNames: WeakMap<JSONSchema7, string>,
  selectedCandidates: Map<string, CodecSchemaCandidate>,
  definitions: Record<string, JSONSchema7>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(schema).map(([key, child]) => [
      key,
      replaceCodecCandidates(child, definitionNames, selectedCandidates, definitions),
    ]),
  );
}

/**
 * Inline definitions whose remaining references cost at least as much as the
 * repeated schema bodies. This removes nested candidates that became
 * single-use after a parent codec was moved into a definition.
 *
 * @param schema - Root schema without its definitions
 * @param definitions - Generated definitions
 * @returns Schema with only profitable definitions
 */
function inlineUnprofitableDefinitions(
  schema: JSONSchema7,
  definitions: Record<string, JSONSchema7>,
): JSONSchema7 {
  let result = schema;
  const remainingDefinitions = { ...definitions };

  while (true) {
    const referenceCounts = new Map<string, number>();
    countDefinitionReferences(result, referenceCounts);
    Object.values(remainingDefinitions).forEach((definition) =>
      countDefinitionReferences(definition, referenceCounts),
    );

    const definitionNames = Object.keys(remainingDefinitions);
    const definitionName =
      definitionNames.find((name) => (referenceCounts.get(name) ?? 0) < 2) ??
      definitionNames.find((name) => {
        const definition = remainingDefinitions[name]!;
        const occurrences = referenceCounts.get(name) ?? 0;
        const referenceSize = JSON.stringify({ $ref: `#/definitions/${name}` }).length;
        const definitionSize = JSON.stringify(definition).length + JSON.stringify(name).length + 1;
        return (
          JSON.stringify(definition).length * occurrences <=
          definitionSize + referenceSize * occurrences
        );
      });

    if (!definitionName) {
      break;
    }

    const definition = remainingDefinitions[definitionName]!;
    delete remainingDefinitions[definitionName];
    result = replaceDefinitionReference(result, definitionName, definition) as JSONSchema7;

    for (const [name, remainingDefinition] of Object.entries(remainingDefinitions)) {
      remainingDefinitions[name] = replaceDefinitionReference(
        remainingDefinition,
        definitionName,
        definition,
      ) as JSONSchema7;
    }
  }

  return Object.keys(remainingDefinitions).length > 0
    ? { ...result, definitions: remainingDefinitions }
    : result;
}

/**
 * Count local references to generated definitions.
 *
 * @param value - Current schema value
 * @param referenceCounts - Counts indexed by definition name
 */
function countDefinitionReferences(value: unknown, referenceCounts: Map<string, number>): void {
  if (Array.isArray(value)) {
    value.forEach((item) => countDefinitionReferences(item, referenceCounts));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  if (typeof value.$ref === 'string' && value.$ref.startsWith('#/definitions/')) {
    const definitionName = value.$ref.slice('#/definitions/'.length);
    referenceCounts.set(definitionName, (referenceCounts.get(definitionName) ?? 0) + 1);
  }

  Object.values(value).forEach((child) => countDefinitionReferences(child, referenceCounts));
}

/**
 * Inline every bare reference to one generated definition.
 *
 * @param value - Current schema value
 * @param definitionName - Definition to inline
 * @param definition - Definition body
 * @returns Schema value with matching references replaced
 */
function replaceDefinitionReference(
  value: unknown,
  definitionName: string,
  definition: JSONSchema7,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => replaceDefinitionReference(item, definitionName, definition));
  }

  if (!isRecord(value)) {
    return value;
  }

  if (Object.keys(value).length === 1 && value.$ref === `#/definitions/${definitionName}`) {
    return definition;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      replaceDefinitionReference(child, definitionName, definition),
    ]),
  );
}

/**
 * Build a stable, JSON Pointer-safe definition name.
 *
 * Explicit simple codec names are preferred. Generated io-ts expression names
 * fall back to a codec tag and content hash.
 *
 * @param candidate - Codec schema being named
 * @param usedDefinitionNames - Definition names already allocated
 * @returns Definition name
 */
function buildDefinitionName(
  candidate: CodecSchemaCandidate,
  usedDefinitionNames: Set<string>,
): string {
  const metadata = candidate.codec as CodecMetadata;
  const explicitName =
    typeof metadata.name === 'string' && /^[A-Za-z_][A-Za-z0-9_-]*$/u.test(metadata.name)
      ? metadata.name
      : undefined;
  const codecTag =
    typeof metadata._tag === 'string'
      ? metadata._tag.replace(/Type$/u, '').toLowerCase()
      : 'schema';
  const baseName =
    explicitName ?? `${codecTag || 'schema'}-${hashString(candidate.serializedSchema)}`;
  let definitionName = baseName;
  let suffix = 2;

  while (usedDefinitionNames.has(definitionName)) {
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
