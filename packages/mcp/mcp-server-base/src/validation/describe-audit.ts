import { z } from 'zod';

/**
 * Minimum description length that still conveys intent. Anything shorter is
 * almost always a placeholder like "ID" or "name", which gives an LLM caller
 * nothing useful to reason about.
 */
export const MIN_DESCRIPTION_LENGTH = 8;

/**
 * Strip a single wrapper layer (optional / nullable / default / readonly /
 * catch / branded / effects / pipe) off a Zod schema, returning the inner
 * schema or `undefined` when there is nothing to unwrap.
 *
 * Zod 4 exposes `.unwrap()` on most wrappers; refine/transform/pipe keep their
 * source on `_def`. We try both and guard against returning the schema itself.
 */
function unwrapOnce(schema: z.ZodType): z.ZodType | undefined {
  const unwrapFn = (schema as { unwrap?: () => z.ZodType }).unwrap;
  if (typeof unwrapFn === 'function') {
    try {
      const inner = unwrapFn.call(schema);
      if (inner && inner !== schema && typeof inner === 'object' && '_def' in inner) {
        return inner;
      }
    } catch {
      // Some wrappers throw if there's nothing to unwrap; fall through.
    }
  }
  const def = (
    schema as {
      _def?: { schema?: z.ZodType; innerType?: z.ZodType; in?: z.ZodType };
    }
  )._def;
  if (def) {
    const candidate = def.schema ?? def.innerType ?? def.in;
    if (candidate && candidate !== schema && typeof candidate === 'object' && '_def' in candidate) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Peel every wrapper layer until the structural core (object / array / record /
 * scalar / union) is reached.
 */
function coreType(schema: z.ZodType): z.ZodType {
  let current = schema;
  for (let depth = 0; depth < 25; depth++) {
    const inner = unwrapOnce(current);
    if (!inner) break;
    current = inner;
  }
  return current;
}

/**
 * Read the human-authored description off a schema, looking through wrapper
 * layers since authors chain `.describe()` before or after `.optional()` etc.
 */
function readDescription(schema: z.ZodType): string | undefined {
  const direct = (schema as { description?: unknown }).description;
  if (typeof direct === 'string' && direct.length > 0) {
    return direct;
  }
  const inner = unwrapOnce(schema);
  return inner ? readDescription(inner) : undefined;
}

function arrayElement(schema: z.ZodType): z.ZodType | undefined {
  if (!(schema instanceof z.ZodArray)) return undefined;
  const s = schema as unknown as {
    element?: z.ZodType;
    _def?: { type?: z.ZodType; element?: z.ZodType };
  };
  return s.element ?? s._def?.type ?? s._def?.element;
}

function recordValue(schema: z.ZodType): z.ZodType | undefined {
  if (!(schema instanceof z.ZodRecord)) return undefined;
  const s = schema as unknown as {
    valueType?: z.ZodType;
    _def?: { valueType?: z.ZodType };
  };
  return s.valueType ?? s._def?.valueType;
}

function walkObject(
  schema: z.ZodObject<z.ZodRawShape>,
  prefix: string,
  missing: string[],
  seen: Set<z.ZodType>,
): void {
  if (seen.has(schema)) return;
  seen.add(schema);

  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const description = readDescription(fieldSchema as z.ZodType);
    if (!description || description.trim().length < MIN_DESCRIPTION_LENGTH) {
      missing.push(path);
    }
    descend(fieldSchema as z.ZodType, path, missing, seen);
  }
}

/**
 * Recurse into nested object-bearing structures so descriptions are enforced
 * at every depth: object fields, array-of-object elements, and record values.
 * Arrays/records of primitives need a description only on the field itself
 * (already checked by the caller), so we stop there.
 */
function descend(
  fieldSchema: z.ZodType,
  path: string,
  missing: string[],
  seen: Set<z.ZodType>,
): void {
  const core = coreType(fieldSchema);

  if (core instanceof z.ZodObject) {
    walkObject(core, path, missing, seen);
    return;
  }

  const element = arrayElement(core);
  if (element) {
    const elementCore = coreType(element);
    if (elementCore instanceof z.ZodObject) {
      walkObject(elementCore, `${path}[]`, missing, seen);
    }
    return;
  }

  const value = recordValue(core);
  if (value) {
    const valueCore = coreType(value);
    if (valueCore instanceof z.ZodObject) {
      walkObject(valueCore, `${path}{}`, missing, seen);
    }
  }
}

/**
 * Walk a tool's input schema and return the dotted paths of every field that
 * is missing a Zod description or whose description is shorter than
 * {@link MIN_DESCRIPTION_LENGTH}. Recurses through wrappers, nested objects,
 * arrays of objects, and record values. Returns an empty array when the schema
 * is fully documented (or has no introspectable object fields).
 *
 * Paths use `[]` to denote an array element and `{}` a record value, e.g.
 * `filterBy.statuses[]` or `metadata{}.label`.
 */
export function collectMissingDescriptions(schema: z.ZodType): string[] {
  const missing: string[] = [];
  const core = coreType(schema);
  if (core instanceof z.ZodObject) {
    walkObject(core, '', missing, new Set());
  }
  return missing;
}
