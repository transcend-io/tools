import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { CustomFunctionsMixin } from '../graphql.js';

export const CustomFunctionsGetCodeSchema = z.object({
  id: z.string().describe('Custom function ID from custom_functions_list or upsert'),
  versionId: z
    .string()
    .optional()
    .describe(
      'Expected readable version ID. Omit to read the active version, or the latest draft when ' +
        'no active version exists',
    ),
});
export type CustomFunctionsGetCodeInput = z.infer<typeof CustomFunctionsGetCodeSchema>;

export function createCustomFunctionsGetCodeTool(clients: ToolClients) {
  const graphql = clients.graphql as CustomFunctionsMixin;
  return defineTool({
    name: 'custom_functions_get_code',
    description:
      'Load plaintext TypeScript and runtime context for a Custom Function so it can be edited. ' +
      'Returns version.successfulTestRun so you can confirm custom_functions_test_run. ' +
      'This is read-only but sensitive: userDefinedEnv may contain secrets. Readable version is ' +
      'the active version, or the latest draft when no active version exists.',
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
