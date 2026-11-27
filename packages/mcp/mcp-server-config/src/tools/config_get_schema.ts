import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  TR_YML_RESOURCE_TO_FIELD_NAME,
  TranscendInput,
  TranscendPullResource,
} from '@transcend-io/sdk';
import { toJsonSchema } from '@transcend-io/type-utils';

const TRANSCEND_PULL_RESOURCE_VALUES = Object.values(TranscendPullResource) as [
  TranscendPullResource,
  ...TranscendPullResource[],
];

const TranscendPullResourceSchema = z.enum(TRANSCEND_PULL_RESOURCE_VALUES);

const FULL_SCHEMA_WARNING =
  'Full transcend.yml JSON schema is very large (about 160k tokens). Prefer requesting specific resources.';

const SCHEMA_CATALOG_HINT =
  'No schema returned. Pass resources for section schemas, or set includeFullSchema to true for the full file.';

export const ConfigGetSchemaSchema = z.object({
  resources: z
    .array(TranscendPullResourceSchema)
    .optional()
    .describe('Sections to describe, such as ["dataSilos"]. Omit for a catalog of all sections.'),
  includeFullSchema: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'When true and resources is omitted, return the full file schema. Very large; can overflow agent context.',
    ),
});

export type ConfigGetSchemaInput = z.infer<typeof ConfigGetSchemaSchema>;

let cachedSchema: ReturnType<typeof toJsonSchema> | undefined;

/** Built on first use: the codec is large, and most sessions never need it. */
function getTranscendInputSchema(): ReturnType<typeof toJsonSchema> {
  cachedSchema ??= toJsonSchema(TranscendInput);
  return cachedSchema;
}

function buildKeyBySection(resources: readonly TranscendPullResource[]) {
  const sections =
    resources.length > 0
      ? resources
      : (Object.values(TranscendPullResource) as TranscendPullResource[]);
  return Object.fromEntries(
    sections.map((resource) => [resource, TR_YML_RESOURCE_TO_FIELD_NAME[resource]]),
  );
}

export function createConfigGetSchemaTool(_clients: ToolClients) {
  return defineTool({
    name: 'config_get_schema',
    description:
      'Get transcend.yml JSON schema for chosen sections, or a section catalog when resources is omitted. ' +
      'Use before editing a file for config_push. The full-file schema is huge; pass resources or only set ' +
      'includeFullSchema when you truly need every section at once.',
    category: 'Config',
    readOnly: true,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    zodSchema: ConfigGetSchemaSchema,
    handler: async ({ resources = [], includeFullSchema = false }) => {
      const keyBySection = buildKeyBySection(resources);

      if (resources.length === 0 && !includeFullSchema) {
        return {
          keyBySection,
          validSections: TRANSCEND_PULL_RESOURCE_VALUES,
          hint: SCHEMA_CATALOG_HINT,
        };
      }

      const schema = getTranscendInputSchema();

      if (resources.length === 0) {
        return { schema, keyBySection, warning: FULL_SCHEMA_WARNING };
      }

      const keys = new Set<string>(Object.values(keyBySection));
      const { required: _required, ...rest } = schema;
      return {
        schema: {
          ...rest,
          properties: Object.fromEntries(
            Object.entries(schema.properties ?? {}).filter(([key]) => keys.has(key)),
          ),
        },
        keyBySection,
      };
    },
  });
}
