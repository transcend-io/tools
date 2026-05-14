import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';
import { AssessmentStatusEnum } from './assessments_list.js';

export const UpdateAssessmentSchema = z.object({
  assessment_id: z.string().describe('ID of the assessment to update'),
  title: z.string().optional().describe('New title for the assessment'),
  description: z.string().optional().describe('New description'),
  reviewer_ids: z
    .array(z.string())
    .optional()
    .describe('IDs of users assigned to review this assessment'),
  due_date: z.string().optional().describe('New due date (ISO format)'),
  status: AssessmentStatusEnum.optional().describe('New status'),
});
export type UpdateAssessmentInput = z.infer<typeof UpdateAssessmentSchema>;

export function createAssessmentsUpdateTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_update',
    description:
      'Update an existing assessment. The response includes a `url` field with the canonical admin-dashboard link — surface that to the user verbatim and do not construct assessment URLs from raw IDs.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Updates the assessment',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: UpdateAssessmentSchema,
    handler: async ({ assessment_id, title, description, reviewer_ids, due_date, status }) => {
      const result = await graphql.updateAssessment({
        id: assessment_id,
        title,
        description,
        reviewerIds: reviewer_ids,
        dueDate: due_date,
        status,
      });

      const links = buildAssessmentLinks({
        dashboardUrl,
        assessmentFormId: result.id,
        assessmentGroupId: result.assessmentGroupId,
        status: result.status,
      });

      return createToolResult(true, {
        assessment: { ...result, ...links },
        ...links,
        message: `Assessment updated successfully. View it at ${links.url}`,
      });
    },
  });
}
