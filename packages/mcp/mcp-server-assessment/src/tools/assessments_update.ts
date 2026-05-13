import {
  AssessmentSchema,
  createToolResult,
  defineTool,
  envelopeSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
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
  return defineTool({
    name: 'assessments_update',
    description: 'Update an existing assessment',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Updates the assessment',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: UpdateAssessmentSchema,
    outputZodSchema: envelopeSchema(
      z.object({
        assessment: AssessmentSchema,
        message: z.string(),
      }),
    ),
    handler: async ({ assessment_id, title, description, reviewer_ids, due_date, status }) => {
      const result = await graphql.updateAssessment({
        id: assessment_id,
        title,
        description,
        reviewerIds: reviewer_ids,
        dueDate: due_date,
        status,
      });

      return createToolResult(true, {
        assessment: result,
        message: 'Assessment updated successfully',
      });
    },
  });
}
