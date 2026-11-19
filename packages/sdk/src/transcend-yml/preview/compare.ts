import type { FieldChange, PlainObject } from './types.js';

/** Describes how to compare an object and its nested lists */
export interface Shape {
  /** Fields pull returns that push never writes. They are skipped. */
  ignoreFields?: readonly string[];
  /** Fields push writes that pull cannot read. They are reported separately. */
  writeOnlyFields?: readonly string[];
  /** Lists where order matters. Other lists are compared as unordered sets. */
  orderedFields?: readonly string[];
  /** Rewrite an object before comparing, on both the local and remote side */
  canonicalize?: (item: PlainObject) => PlainObject;
  /** Lists of objects that are matched item by item instead of compared as a whole */
  nested?: Record<string, NestedList>;
}

/** A nested list whose items are matched by an identity key */
export interface NestedList extends Shape {
  /** Identity of an item within the list. Undefined means the item cannot be matched. */
  identity: (item: PlainObject) => string | undefined;
}

/** Result of comparing one local object with its remote counterpart */
export interface ObjectComparison {
  /** Fields that differ */
  fields: FieldChange[];
  /** Write-only fields push will set */
  writeOnly: string[];
}

/**
 * Check whether a value is a plain object.
 *
 * @param value - Value to check
 * @returns True for non-null, non-array objects
 */
export function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Treat null, empty strings, empty lists, and empty objects as "not set".
 * Pull omits these values, so they must not look like changes.
 *
 * @param value - Raw value
 * @returns The value, or undefined when it is effectively empty
 */
export function normalizeEmpty(value: unknown): unknown {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? undefined : value;
  }
  if (isPlainObject(value)) {
    return Object.keys(value).length === 0 ? undefined : value;
  }
  return value;
}

/**
 * Stable string form of a value. Object keys are sorted. Lists are sorted unless ordered.
 *
 * @param value - Value to serialize
 * @param ordered - When true, keep the order of the top-level list
 * @returns Canonical string
 */
export function canonicalString(value: unknown, ordered = false): string {
  if (Array.isArray(value)) {
    const parts = value.map((entry) => canonicalString(entry));
    return `[${(ordered ? parts : [...parts].sort()).join(',')}]`;
  }
  if (isPlainObject(value)) {
    const entries = Object.keys(value)
      .filter((key) => normalizeEmpty(value[key]) !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalString(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function asList(value: unknown): PlainObject[] {
  return Array.isArray(value) ? value.filter(isPlainObject) : [];
}

function indexByIdentity(list: PlainObject[], nested: NestedList): Map<string, PlainObject> {
  const index = new Map<string, PlainObject>();
  list.forEach((item) => {
    const id = nested.identity(nested.canonicalize ? nested.canonicalize(item) : item);
    if (id !== undefined && !index.has(id)) {
      index.set(id, item);
    }
  });
  return index;
}

function compareList(
  path: string,
  local: unknown[],
  remote: unknown,
  nested: NestedList,
): ObjectComparison {
  const result: ObjectComparison = { fields: [], writeOnly: [] };
  const remoteIndex = indexByIdentity(asList(remote), nested);
  asList(local).forEach((localItem) => {
    const canonicalLocal = nested.canonicalize ? nested.canonicalize(localItem) : localItem;
    const id = nested.identity(canonicalLocal);
    const itemPath = `${path}[${id ?? '?'}]`;
    const match = id === undefined ? undefined : remoteIndex.get(id);
    if (!match) {
      result.fields.push({ path: itemPath, before: undefined, after: localItem, kind: 'added' });
      return;
    }
    const inner = compareObjects(localItem, match, nested, itemPath);
    result.fields.push(...inner.fields);
    result.writeOnly.push(...inner.writeOnly);
  });
  return result;
}

interface CompareValueOptions {
  /** Nested list definition for this field, if any */
  nested?: NestedList;
  /** When true, list order matters */
  ordered: boolean;
}

function compareValue(
  path: string,
  local: unknown,
  remote: unknown,
  options: CompareValueOptions,
): ObjectComparison {
  const empty: ObjectComparison = { fields: [], writeOnly: [] };
  if (Array.isArray(local) && options.nested) {
    return compareList(path, local, remote, options.nested);
  }
  if (isPlainObject(local) && isPlainObject(remote)) {
    return compareObjects(local, remote, {}, path);
  }
  const before = normalizeEmpty(remote);
  if (canonicalString(local, options.ordered) === canonicalString(before, options.ordered)) {
    return empty;
  }
  return { fields: [{ path, before, after: local, kind: 'changed' }], writeOnly: [] };
}

/**
 * Compare a local object with its remote counterpart.
 * Only fields set in the local object are compared, because push skips omitted fields.
 *
 * @param local - Object from the user's file
 * @param remote - Matching object pulled from the organization, if any
 * @param shape - How to treat ignored, write-only, ordered, and nested fields
 * @param basePath - Path prefix for nested results
 * @returns Differing fields and write-only fields
 */
export function compareObjects(
  local: PlainObject,
  remote: PlainObject | undefined,
  shape: Shape,
  basePath = '',
): ObjectComparison {
  const canonicalLocal = shape.canonicalize ? shape.canonicalize(local) : local;
  const canonicalRemote =
    remote && shape.canonicalize ? shape.canonicalize(remote) : (remote ?? {});
  const result: ObjectComparison = { fields: [], writeOnly: [] };

  Object.entries(canonicalLocal).forEach(([key, value]) => {
    if (shape.ignoreFields?.includes(key) || normalizeEmpty(value) === undefined) {
      return;
    }
    const path = basePath ? `${basePath}.${key}` : key;
    if (shape.writeOnlyFields?.includes(key)) {
      result.writeOnly.push(path);
      return;
    }
    const inner = compareValue(path, value, canonicalRemote[key], {
      nested: shape.nested?.[key],
      ordered: shape.orderedFields?.includes(key) ?? false,
    });
    result.fields.push(...inner.fields);
    result.writeOnly.push(...inner.writeOnly);
  });
  return result;
}
