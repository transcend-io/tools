import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { CustomFunctionsMixin } from '../graphql.js';
import { customFunctionDashboardUrl, customFunctionNextStep } from '../helpers/nextStep.js';

export const CustomFunctionsPromoteVersionSchema = z.object({
  customFunctionId: z.string().describe('Custom function ID'),
  versionId: z.string().describe('draftVersion.id from upsert or list'),
});
export type CustomFunctionsPromoteVersionInput = z.infer<
  typeof CustomFunctionsPromoteVersionSchema
>;

export function createCustomFunctionsPromoteVersionTool(clients: ToolClients) {
  const graphql = clients.graphql as CustomFunctionsMixin;
  return defineTool({
    name: 'custom_functions_promote_version',
    description:
      'Promote a draft Custom Function version to active. Does not run tests; returns ' +
      'dependencyWarnings when follow-up may be needed.',
    category: 'Custom Functions',
    readOnly: false,
    confirmation: {
      hint:
        'Makes this draft Custom Function version the live one. Traffic that runs this ' +
        'function starts using the new code immediately. Check customFunctionId and versionId ' +
        'in the call arguments before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    zodSchema: CustomFunctionsPromoteVersionSchema,
    handler: async ({ customFunctionId, versionId }) => {
      const result = await graphql.promoteCustomFunctionVersion(customFunctionId, versionId);
      return createToolResult(true, {
        customFunction: result.customFunction,
        dependencyWarnings: result.dependencyWarnings,
        dashboardHint: `Review this function at ${customFunctionDashboardUrl(clients.dashboardUrl, result.customFunction.id)}.`,
        nextStep: customFunctionNextStep({
          kind: 'promoted',
          id: result.customFunction.id,
        }),
      });
    },
  });
}
