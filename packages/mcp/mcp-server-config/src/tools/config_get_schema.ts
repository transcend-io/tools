import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  TR_YML_RESOURCE_TO_FIELD_NAME,
  TranscendInput,
  TranscendPullResource,
} from '@transcend-io/sdk';
import { toJsonSchema } from '@transcend-io/type-utils';

import { parseResources } from '../helpers/resources.js';

export const ConfigGetSchemaSchema = z.object({
  resources: z
    .array(z.string())
    .optional()
    .describe('Section names to describe, such as ["dataSilos"]. Omit for the whole file.'),
});

export type ConfigGetSchemaInput = z.infer<typeof ConfigGetSchemaSchema>;

let cachedSchema: ReturnType<typeof toJsonSchema> | undefined;

/** Built on first use: the codec is large, and most sessions never need it. */
function getTranscendInputSchema(): ReturnType<typeof toJsonSchema> {
  cachedSchema ??= toJsonSchema(TranscendInput);
  return cachedSchema;
}

export function createConfigGetSchemaTool(_clients: ToolClients) {
  return defineTool({
    name: 'config_get_schema',
    description:
      'Get the JSON schema of the transcend.yml file, optionally for chosen sections only. ' +
      'Use it before editing a file for config_push. Also returns the top-level yaml key for ' +
      'each section name.',
    category: 'Config',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ConfigGetSchemaSchema,
    handler: async ({ resources: names = [] }) => {
      const resources = parseResources(names);
      const schema = getTranscendInputSchema();
      const keyBySection = Object.fromEntries(
        (resources.length > 0 ? resources : Object.values(TranscendPullResource)).map(
          (resource) => [resource, TR_YML_RESOURCE_TO_FIELD_NAME[resource]],
        ),
      );

      if (resources.length === 0) {
        return { schema, keyBySection };
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
