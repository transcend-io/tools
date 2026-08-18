import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { CustomFunctionsMixin } from '../graphql.js';
import { customFunctionDashboardUrl, customFunctionNextStep } from '../helpers/nextStep.js';

export const CustomFunctionsPromoteVersionSchema = z.object({
  customFunctionId: z
    .string()
    .describe('Custom function ID whose draft version should become active'),
  versionId: z
    .string()
    .describe('Draft version ID to promote. Pass draftVersion.id from the last upsert or list'),
});
export type CustomFunctionsPromoteVersionInput = z.infer<
  typeof CustomFunctionsPromoteVersionSchema
>;

export function createCustomFunctionsPromoteVersionTool(clients: ToolClients) {
  const graphql = clients.graphql as CustomFunctionsMixin;
  return defineTool({
    name: 'custom_functions_promote_version',
    description:
      'Promote a draft Custom Function version to active. Pass draftVersion.id from the last ' +
      'upsert or list. This does not run tests. If successfulTestRun is false, pass testPayloads ' +
      'on a draft upsert or custom_functions_test_run with { id } while the version is still a ' +
      'draft. Returns lifecycle dependency warnings that may require follow-up.',
    category: 'Custom Functions',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
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
