import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const UpdateAssigneesSchema = z.object({
  assessment_id: z.string().describe('ID of the assessment form to update assignees for'),
  assignee_ids: z
    .array(z.string())
    .optional()
    .describe('Array of internal user IDs to assign to the assessment'),
  external_assignee_emails: z
    .array(z.string())
    .optional()
    .describe('Array of external email addresses to assign to the assessment'),
});

export function createAssessmentsUpdateAssigneesTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_update_assignees',
    description:
      'Assign internal users (by ID) or external users (by email) to an assessment form. This also transitions DRAFT assessments to SHARED status.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Assigns users to the assessment form',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: UpdateAssigneesSchema,
    handler: async ({ assessment_id, assignee_ids, external_assignee_emails }) => {
      const result = await graphql.updateAssessmentFormAssignees({
        id: assessment_id,
        assigneeIds: assignee_ids,
        externalAssigneeEmails: external_assignee_emails,
      });

      return createToolResult(true, {
        assessment: result,
        message: `Assessment assignees updated successfully. Status: ${result.status}`,
      });
    },
  });
}
