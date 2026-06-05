import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { confirmCreateConfirmation } from '../pending-create-confirmation.js';

export const ConfirmCreateSchema = z.object({
  title: z.string().min(1).describe('Confirmed assessment title from the create form UI'),
  assessment_group_id: z.string().describe('Confirmed assessment group ID from the create form UI'),
  assignee_ids: z
    .array(z.string())
    .min(1)
    .describe('Confirmed internal user IDs from the create form UI'),
  confirmation_token: z
    .string()
    .min(1)
    .describe('One-time confirmation token from assessments_get_create_form_context'),
});
export type ConfirmCreateInput = z.infer<typeof ConfirmCreateSchema>;

export function createAssessmentsConfirmCreateTool(_clients: ToolClients) {
  return defineTool({
    name: 'assessments_confirm_create',
    description:
      'Internal tool used by the assessment create form MCP App to confirm title, group, and assignee. ' +
      'Agents should not call this directly.',
    category: 'Assessments',
    readOnly: false,
    internal: true,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: ConfirmCreateSchema,
    handler: async ({ title, assessment_group_id, assignee_ids, confirmation_token }) => {
      const context = confirmCreateConfirmation({
        title,
        assessmentGroupId: assessment_group_id,
        assigneeIds: assignee_ids,
        confirmationToken: confirmation_token,
      });
      return createToolResult(true, {
        ok: true,
        title,
        assessmentGroupId: assessment_group_id,
        assigneeIds: assignee_ids,
        operation: context.operation,
        message: `Create confirmed for "${title}".`,
      });
    },
  });
}
