import { toJsonSchema } from '@transcend-io/type-utils';

import { z } from '../validation/index.js';
import { MAX_SECTION_WRITE_ITEMS } from './constants.js';

/** An io-ts codec, as `toJsonSchema` takes it. */
type Codec = Parameters<typeof toJsonSchema>[0];

/** JSON schema node (draft-07), as `toJsonSchema` returns it. */
type JSONSchema7 = ReturnType<typeof toJsonSchema>;

/** Enums with more values than this are shown as plain strings. */
export const MAX_INLINE_ENUM_VALUES = 100;

/**
 * Collapse huge enums and flatten `allOf` object branches so an agent sees one
 * flat object per section.
 *
 * @param node - A JSON schema node
 * @returns A new node
 */
function simplifyNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(simplifyNode);
  }
  if (node === null || typeof node !== 'object') {
    return node;
  }
  const schema = node as JSONSchema7;

  if (Array.isArray(schema.enum) && schema.enum.length > MAX_INLINE_ENUM_VALUES) {
    return {
      type: 'string',
      description: `One of ${schema.enum.length} values. Use config_get_schema for the list.`,
    };
  }

  const simplified = Object.fromEntries(
    Object.entries(schema).map(([key, value]) => [key, simplifyNode(value)]),
  ) as JSONSchema7;

  const branches = simplified.allOf;
  if (
    Array.isArray(branches) &&
    branches.every(
      (branch) =>
        typeof branch === 'object' &&
        branch.type === 'object' &&
        Object.keys(branch).every((key) => ['type', 'properties', 'required'].includes(key)),
    )
  ) {
    const { allOf: _allOf, ...rest } = simplified;
    const objects = branches as JSONSchema7[];
    const required = objects.flatMap((branch) => branch.required ?? []);
    return {
      ...rest,
      type: 'object',
      properties: Object.assign({}, ...objects.map((branch) => branch.properties ?? {})),
      ...(required.length > 0 && { required }),
    };
  }

  return simplified;
}

/**
 * JSON schema for a transcend.yml codec, sized for a tool listing.
 *
 * Enums over {@link MAX_INLINE_ENUM_VALUES} values become plain strings. Country
 * subdivisions alone are about 5,000 values.
 *
 * @param codec - io-ts codec for the section
 * @returns A JSON schema with no `$ref`s, so it is safe to embed in a tool schema
 */
export function codecJsonSchema(codec: Codec): JSONSchema7 {
  const { $schema: _dialect, ...schema } = simplifyNode(toJsonSchema(codec)) as JSONSchema7;
  return schema;
}

/**
 * Zod schema for one record argument of a transcend.yml section write tool.
 *
 * Zod only checks that the value is an object. The tool's JSON schema comes from
 * the codec, and the handler validates with the same codec.
 *
 * @param codec - io-ts codec the yaml section uses
 * @param description - What the record holds, in a sentence
 * @returns The zod record schema
 */
export function ymlRecordSchema(codec: Codec, description: string) {
  return z
    .record(z.string(), z.unknown())
    .meta({ ...codecJsonSchema(codec), description } as Record<string, unknown>);
}

/** Options for {@link ymlItemsSchema}. */
export interface YmlItemsSchemaOptions {
  /** io-ts codec for one item. Its JSON schema is shown to the agent. */
  codec?: Codec;
  /** Maximum items per call */
  max?: number;
}

/**
 * Zod schema for the array argument of a transcend.yml section write tool.
 * Real validation runs against the same io-ts codec the yaml uses.
 *
 * @param itemDescription - What one item looks like, in a sentence
 * @param options - Item codec and maximum items per call, or just the maximum
 * @returns The zod array schema
 */
export function ymlItemsSchema(
  itemDescription: string,
  options: YmlItemsSchemaOptions | number = {},
) {
  const { codec, max = MAX_SECTION_WRITE_ITEMS } =
    typeof options === 'number' ? { max: options } : options;
  const item = z.record(z.string(), z.unknown());
  return z
    .array(codec ? item.meta(codecJsonSchema(codec) as Record<string, unknown>) : item)
    .min(1)
    .max(max)
    .describe(
      `${itemDescription} Same shape as the transcend.yml section; see config_get_schema. ` +
        `Up to ${max} items.`,
    );
}
