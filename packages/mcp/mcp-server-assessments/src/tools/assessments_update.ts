import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const AssessmentStatusEnum = z.enum([
  'DRAFT',
  'SHARED',
  'IN_PROGRESS',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'REJECTED',
  'APPROVED',
]);

const UpdateAssessmentSchema = z.object({
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
    handler: async (args) => {
      try {
        const result = await graphql.updateAssessment({
          id: args.assessment_id,
          title: args.title,
          description: args.description,
          reviewerIds: args.reviewer_ids,
          dueDate: args.due_date,
          status: args.status,
        });

        return createToolResult(true, {
          assessment: result,
          message: 'Assessment updated successfully',
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });
}
