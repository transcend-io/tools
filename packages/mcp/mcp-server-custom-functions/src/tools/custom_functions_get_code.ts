import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { CustomFunctionsMixin } from '../graphql.js';
import { redactUserDefinedEnv } from '../helpers/redactEnv.js';

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
      'Load plaintext TypeScript and runtime context for editing. Prefers a pending draft ' +
      'over active so recent upserts are visible. Env var names are listed; values are ' +
      'redacted — secrets are set in the dashboard, never pass credentials to upsert.',
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
        context: {
          ...source.context,
          userDefinedEnv: redactUserDefinedEnv(source.context.userDefinedEnv),
        },
        envVarNames: Object.keys(source.context.userDefinedEnv),
      });
    },
  });
}
