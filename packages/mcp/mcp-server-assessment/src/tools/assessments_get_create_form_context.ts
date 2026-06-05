import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { getPendingCreateContext } from '../pending-create-confirmation.js';

export const GetCreateFormContextSchema = z.object({});
export type GetCreateFormContextInput = z.infer<typeof GetCreateFormContextSchema>;

export function createAssessmentsGetCreateFormContextTool(_clients: ToolClients) {
  return defineTool({
    name: 'assessments_get_create_form_context',
    description:
      'Internal tool used by the assessment create form MCP App to fetch confirmation token and suggested defaults.',
    category: 'Assessments',
    readOnly: true,
    internal: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetCreateFormContextSchema,
    handler: async () => {
      const context = getPendingCreateContext();
      if (!context) {
        return createToolResult(
          false,
          undefined,
          'No assessment create confirmation is waiting for this session.',
        );
      }

      return createToolResult(true, {
        confirmationToken: context.confirmationToken,
        suggestedTitle: context.suggestedTitle,
        suggestedAssessmentGroupId: context.suggestedAssessmentGroupId,
        suggestedAssigneeId: context.suggestedAssigneeId,
        operation: context.operation,
      });
    },
  });
}
