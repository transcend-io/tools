import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { CustomFunctionsMixin } from '../graphql.js';

export const CustomFunctionsGetCodeSchema = z.object({
  id: z.string().describe('Custom function ID from list or upsert'),
  versionId: z
    .string()
    .optional()
    .describe('Readable version ID; omit for active, or latest draft if none'),
});
export type CustomFunctionsGetCodeInput = z.infer<typeof CustomFunctionsGetCodeSchema>;

export function createCustomFunctionsGetCodeTool(clients: ToolClients) {
  const graphql = clients.graphql as CustomFunctionsMixin;
  return defineTool({
    name: 'custom_functions_get_code',
    description:
      'Load plaintext TypeScript and runtime context for editing. Returns ' +
      'version.successfulTestRun. Sensitive: userDefinedEnv may include secrets.',
    category: 'Custom Functions',
    readOnly: true,
    requireSombra: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: CustomFunctionsGetCodeSchema,
    handler: async ({ id, versionId }) => {
      const signed = await graphql.getSignedCustomFunctionVersion(id, versionId);
      const source = await clients.rest.unwrapCustomFunction({
        signedCodeJwt: signed.signedCodeJwt,
        signedCodeContextJwt: signed.signedCodeContextJwt,
      });
      return createToolResult(true, {
        customFunction: signed.customFunction,
        version: signed.version,
        code: source.code,
        context: source.context,
      });
    },
  });
}
