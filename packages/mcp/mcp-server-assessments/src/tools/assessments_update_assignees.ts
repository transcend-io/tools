import {
  createToolResult,
  z,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const UpdateAssigneesSchema = z.object({
  assessment_id: z.string(),
  assignee_ids: z.array(z.string()).optional(),
  external_assignee_emails: z.array(z.string()).optional(),
});

export function createAssessmentsUpdateAssigneesTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_update_assignees',
    description:
      'Assign internal users (by ID) or external users (by email) to an assessment form. This also transitions DRAFT assessments to SHARED status.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Assigns users to the assessment form',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: UpdateAssigneesSchema,
    handler: async (args: z.infer<typeof UpdateAssigneesSchema>) => {
      try {
        const result = await graphql.updateAssessmentFormAssignees({
          id: args.assessment_id,
          assigneeIds: args.assignee_ids,
          externalAssigneeEmails: args.external_assignee_emails,
        });

        return createToolResult(true, {
          assessment: result,
          message: `Assessment assignees updated successfully. Status: ${result.status}`,
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}
