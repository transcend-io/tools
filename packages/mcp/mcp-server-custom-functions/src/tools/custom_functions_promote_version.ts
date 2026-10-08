import {
  createToolResult,
  defineTool,
  ErrorCode,
  ToolError,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { CustomFunctionsMixin } from '../graphql.js';
import { customFunctionNextStep } from '../helpers/nextStep.js';

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
      'untestedWarning when the draft never passed custom_functions_test_run. Returns ' +
      'dependencyWarnings when follow-up may be needed.',
    category: 'Custom Functions',
    readOnly: false,
    confirmation: {
      hint:
        'Makes this draft Custom Function version the live one. Traffic that runs this ' +
        'function starts using the new code immediately. Check customFunctionId and versionId ' +
        'in the call arguments before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: CustomFunctionsPromoteVersionSchema,
    handler: async ({ customFunctionId, versionId }) => {
      const summary = await graphql.getCustomFunctionSummary(customFunctionId);
      if (!summary.hasPendingDraft || !summary.draftVersion) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          `Custom function ${customFunctionId} has no pending draft to promote. Save a draft with ` +
            'custom_functions_upsert first.',
          false,
        );
      }
      if (summary.draftVersion.id !== versionId) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          `versionId must be the pending draft ${summary.draftVersion.id}, not ${versionId}.`,
          false,
          { draftVersionId: summary.draftVersion.id },
        );
      }

      const untestedWarning =
        summary.draftVersion.successfulTestRun === false
          ? `Draft ${versionId} was not marked tested. Run custom_functions_test_run { id: "${customFunctionId}" } before promoting when possible.`
          : undefined;

      const result = await graphql.promoteCustomFunctionVersion(customFunctionId, versionId);
      return createToolResult(true, {
        customFunction: result.customFunction,
        dependencyWarnings: result.dependencyWarnings,
        ...(untestedWarning ? { untestedWarning } : {}),
        nextStep: customFunctionNextStep({
          kind: 'promoted',
          id: result.customFunction.id,
        }),
      });
    },
  });
}
