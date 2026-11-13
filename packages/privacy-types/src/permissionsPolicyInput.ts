import { toJsonSchema } from '@transcend-io/type-utils';
import * as t from 'io-ts';

/**
 * Published raw GitHub URL for the Permissions API OPA input JSON Schema.
 * The CLI copies this document to `packages/cli/schema/permissions-policy-input.json`.
 */
export const PERMISSIONS_POLICY_INPUT_SCHEMA_ID =
  'https://raw.githubusercontent.com/transcend-io/tools/main/packages/cli/schema/permissions-policy-input.json';

/**
 * Whole non-negative days since a preference was last set (OPA `days_since_choice`).
 *
 * Typed as plain `number` (not branded `t.Int`) so producers like Sombra can
 * assign `Math.floor(...)` without casts; runtime still requires an integer ≥ 0.
 */
const NonNegativeInt = new t.Type<number, number, unknown>(
  'NonNegativeInt',
  (u): u is number => typeof u === 'number' && Number.isInteger(u) && u >= 0,
  (u, c) =>
    typeof u === 'number' && Number.isInteger(u) && u >= 0 ? t.success(u) : t.failure(u, c),
  t.identity,
);

/**
 * Topic choice under a purpose, projected from the Preference Store
 * `preferences[]` entry. `choice` flattens the store's
 * `booleanValue` / `selectValue` / `selectValues` into one field.
 */
export const PermissionsPolicyTopicEntry = t.type({
  /** Topic slug (for example Frequency or SnowAlerts). */
  name: t.string,
  /** Boolean topic choice, single-select value, multi-select values, or null when unset. */
  choice: t.union([t.boolean, t.string, t.array(t.string), t.null]),
});

/** Type override. */
export type PermissionsPolicyTopicEntry = t.TypeOf<typeof PermissionsPolicyTopicEntry>;

/**
 * Preference row projected into the OPA `input.preferences` bag.
 * Snake_case matches the Rego wire format.
 */
export const PermissionsPolicyPreferenceEntry = t.intersection([
  t.type({
    /** Purpose slug (for example Analytics or SaleOfInfo). */
    name: t.string,
    /** true when opted in, false when opted out, or null when unset. */
    choice: t.union([t.boolean, t.null]),
  }),
  t.partial({
    /**
     * Whole days since the preference was last set.
     * Omitted when no timestamp is available.
     */
    days_since_choice: NonNegativeInt,
    /**
     * Topic choices stored under this purpose. Omitted when the purpose has none;
     * unset topics are absent rather than padded.
     */
    topics: t.array(PermissionsPolicyTopicEntry),
  }),
]);

/** Type override. */
export type PermissionsPolicyPreferenceEntry = t.TypeOf<typeof PermissionsPolicyPreferenceEntry>;

/**
 * JSON document Sombra posts as `{ input }` when evaluating a Permissions
 * policy bundle via the OPA Data API.
 */
export const PermissionsPolicyInput = t.type({
  /** Purpose preference rows from Preference Store for the current subject. */
  preferences: t.array(PermissionsPolicyPreferenceEntry),
  /**
   * Caller-supplied context for the decision (for example region).
   * Use an empty object when none is provided.
   */
  context: t.record(t.string, t.unknown),
});

/** Type override. */
export type PermissionsPolicyInput = t.TypeOf<typeof PermissionsPolicyInput>;

/**
 * Canonical example used as JSON Schema `examples[0]` and CLI scaffold input.
 */
export const PERMISSIONS_POLICY_INPUT_EXAMPLE: PermissionsPolicyInput = {
  preferences: [
    {
      name: 'Analytics',
      choice: true,
      days_since_choice: 42,
      topics: [{ name: 'Frequency', choice: 'Weekly' }],
    },
    {
      name: 'SaleOfInfo',
      choice: null,
    },
  ],
  context: {
    region: 'US-CA',
  },
};

/** JSON Schema draft-07 document shape returned by {@link buildPermissionsPolicyInputJsonSchema}. */
export type PermissionsPolicyInputJsonSchema = {
  /** Draft identifier. */
  $schema: string;
  /** Canonical URL of this schema document. */
  $id: string;
  /** Human-readable title. */
  title: string;
  /** Human-readable description. */
  description: string;
  /** Root type. */
  type: 'object';
  /** Whether unknown root properties are allowed. */
  additionalProperties: boolean;
  /** Required root property names. */
  required: string[];
  /** Root property schemas. */
  properties: Record<string, unknown>;
  /** Worked examples for authoring and scaffolding. */
  examples: PermissionsPolicyInput[];
};

type JsonSchemaObject = {
  /** Schema type. */
  type?: string | string[];
  /** Required property names. */
  required?: string[];
  /** Nested property schemas. */
  properties?: Record<string, JsonSchemaNode>;
  /** Whether unknown properties are allowed, or a value schema. */
  additionalProperties?: boolean | JsonSchemaNode;
  /** Array item schema. */
  items?: JsonSchemaNode;
  /** Union alternatives. */
  anyOf?: JsonSchemaNode[];
  /** Intersection alternatives. */
  allOf?: JsonSchemaNode[];
  /** Human-readable description. */
  description?: string;
  /** Inclusive numeric minimum. */
  minimum?: number;
  /** Constant value. */
  const?: unknown;
};

type JsonSchemaNode = JsonSchemaObject;

/**
 * Merge `allOf` object fragments from `toJsonSchema` into a single object schema.
 *
 * @param schema - Possibly `allOf`-wrapped object schema
 * @returns Flattened object schema when every branch is an object
 */
function flattenAllOfObject(schema: JsonSchemaNode): JsonSchemaNode {
  if (!schema.allOf?.length) {
    return schema;
  }

  const branches = schema.allOf.map(flattenAllOfObject);
  if (!branches.every((branch) => branch.type === 'object')) {
    return schema;
  }

  const required = [...new Set(branches.flatMap((branch) => branch.required ?? []))];
  const properties = branches.reduce<Record<string, JsonSchemaNode>>((accumulator, branch) => {
    Object.assign(accumulator, branch.properties ?? {});
    return accumulator;
  }, {});

  const additionalProperties = branches.some((branch) => branch.additionalProperties === false)
    ? false
    : branches.find((branch) => branch.additionalProperties !== undefined)?.additionalProperties;

  return {
    type: 'object',
    ...(required.length > 0 ? { required } : {}),
    properties,
    ...(additionalProperties !== undefined ? { additionalProperties } : {}),
  };
}

/**
 * Collapse `anyOf: [{ type: 'boolean' }, { type: 'null' }]` into OPA-friendly
 * `type: ['boolean', 'null']`.
 *
 * @param schema - Node that may be a boolean|null union
 * @returns Normalized node
 */
function normalizeBooleanNullUnion(schema: JsonSchemaNode): JsonSchemaNode {
  const alternatives = schema.anyOf;
  if (!alternatives || alternatives.length !== 2) {
    return schema;
  }

  const types = new Set(alternatives.map((alternative) => alternative.type));
  if (types.has('boolean') && types.has('null')) {
    const { anyOf, ...rest } = schema;
    return { ...rest, type: ['boolean', 'null'] };
  }

  return schema;
}

/**
 * Build the published Permissions API OPA input JSON Schema from the io-ts codecs.
 *
 * Uses `toJsonSchema` for structure, then normalizes unions / intersections and
 * overlays titles, descriptions, examples, and integer bounds so the document
 * stays OPA-friendly.
 *
 * @param options - Optional overrides
 * @returns Draft-07 JSON Schema document
 */
export function buildPermissionsPolicyInputJsonSchema(options?: {
  /** Override `$id` (defaults to {@link PERMISSIONS_POLICY_INPUT_SCHEMA_ID}). */
  $id?: string;
}): PermissionsPolicyInputJsonSchema {
  const generated = toJsonSchema(PermissionsPolicyInput, true, false) as JsonSchemaNode;
  const flattenedRoot = flattenAllOfObject(generated);
  const preferences = flattenedRoot.properties?.preferences;
  const preferenceItems = preferences?.items
    ? normalizeBooleanNullUnion(flattenAllOfObject(preferences.items))
    : undefined;

  if (preferenceItems?.properties?.choice) {
    preferenceItems.properties.choice = normalizeBooleanNullUnion(
      preferenceItems.properties.choice,
    );
  }

  if (preferenceItems?.properties?.days_since_choice) {
    preferenceItems.properties.days_since_choice = {
      type: 'integer',
      minimum: 0,
      description:
        'Whole days since the preference was last set. Omitted when no timestamp is available.',
    };
  }

  if (preferenceItems?.properties?.name) {
    preferenceItems.properties.name = {
      type: 'string',
      description: 'Purpose slug (for example Analytics or SaleOfInfo).',
    };
  }

  if (preferenceItems?.properties?.choice) {
    preferenceItems.properties.choice = {
      ...preferenceItems.properties.choice,
      description: 'true when opted in, false when opted out, or null when unset.',
    };
  }

  if (preferenceItems?.properties) {
    preferenceItems.properties.topics = {
      type: 'array',
      description:
        'Topic choices stored under this purpose. Omitted when the purpose has none; unset topics are absent rather than padded.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'choice'],
        properties: {
          name: {
            type: 'string',
            description: 'Topic slug (for example Frequency or SnowAlerts).',
          },
          choice: {
            type: ['boolean', 'string', 'array', 'null'],
            items: { type: 'string' },
            description:
              'Boolean topic choice, single-select value, multi-select values, or null when unset.',
          },
        },
      },
    };
  }

  const preferenceItemSchema = preferenceItems
    ? {
        type: 'object' as const,
        additionalProperties: false as const,
        required: preferenceItems.required ?? ['name', 'choice'],
        properties: preferenceItems.properties ?? {},
      }
    : {};

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: options?.$id ?? PERMISSIONS_POLICY_INPUT_SCHEMA_ID,
    title: 'Permissions API policy input',
    description:
      'JSON document Sombra posts as `{ input }` when evaluating a Permissions policy bundle via the OPA Data API.',
    type: 'object',
    additionalProperties: false,
    required: ['preferences', 'context'],
    properties: {
      preferences: {
        type: 'array',
        description: 'Purpose preference rows from Preference Store for the current subject.',
        items: preferenceItemSchema,
      },
      context: {
        type: 'object',
        description:
          'Caller-supplied context for the decision (for example region). Use an empty object when none is provided.',
        additionalProperties: true,
      },
    },
    examples: [PERMISSIONS_POLICY_INPUT_EXAMPLE],
  };
}
