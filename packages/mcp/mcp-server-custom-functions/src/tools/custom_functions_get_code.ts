import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { CustomFunctionsMixin } from '../graphql.js';
import { buildReadableVersionContext } from '../helpers/readableCustomFunctionVersion.js';

export const CustomFunctionsGetCodeSchema = z.object({
  id: z.string().describe('Custom function ID from list or upsert'),
  versionId: z
    .string()
    .optional()
    .describe(
      'Readable version ID; omit for preferred version (pending draft if any, else active)',
    ),
});
export type CustomFunctionsGetCodeInput = z.infer<typeof CustomFunctionsGetCodeSchema>;

export function createCustomFunctionsGetCodeTool(clients: ToolClients) {
  const graphql = clients.graphql as CustomFunctionsMixin;
  return defineTool({
    name: 'custom_functions_get_code',
    description:
      'Load plaintext TypeScript and runtime settings for editing (pending draft if any, else active). ' +
      'Pass versionId from the returned versions list to read any version. Returns settings and ' +
      'environmentVariables; secret values are never returned.',
    category: 'Custom Functions',
    readOnly: true,
    requireSombra: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: CustomFunctionsGetCodeSchema,
    handler: async ({ id, versionId }) => {
      const versions = await graphql.listCustomFunctionVersions(id);
      const signed = await graphql.getSignedCustomFunctionVersion(id, versionId, {
        allowInactiveVersion: versionId !== undefined,
      });
      let source;
      try {
        source = await clients.rest.unwrapCustomFunction({
          signedCodeJwt: signed.signedCodeJwt,
          signedCodeContextJwt: signed.signedCodeContextJwt,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Could not decrypt version ${signed.version.id} (${signed.version.versionNumber}). It may ` +
            'have been signed by a previous Sombra gateway. Read a newer version or use the Admin ' +
            `Dashboard. Original error: ${message}`,
        );
      }
      const readable = buildReadableVersionContext(signed.signedCodeContextJwt, source.context);
      return createToolResult(true, {
        customFunction: signed.customFunction,
        version: signed.version,
        code: source.code,
        settings: readable.settings,
        environmentVariables: readable.environmentVariables,
        versions,
      });
    },
  });
}
