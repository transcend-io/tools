import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { CustomFunctionsMixin } from '../graphql.js';
import { redactUserDefinedEnv, unsetEnvPlaceholder } from '../helpers/redactEnv.js';

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
      'Lists environment variable names and allowed hosts; secret values are never returned.',
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
      const userDefinedEnv = source.context.userDefinedEnv;
      const unsetEnvVarNames = Object.keys(userDefinedEnv).filter(
        (name) => userDefinedEnv[name] === unsetEnvPlaceholder(name),
      );
      return createToolResult(true, {
        customFunction: signed.customFunction,
        version: signed.version,
        code: source.code,
        context: {
          ...source.context,
          userDefinedEnv: redactUserDefinedEnv(userDefinedEnv),
        },
        envVarNames: Object.keys(userDefinedEnv),
        ...(unsetEnvVarNames.length > 0 ? { unsetEnvVarNames } : {}),
      });
    },
  });
}
