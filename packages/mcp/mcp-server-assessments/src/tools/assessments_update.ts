import {
  createToolResult,
  z,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

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
  assessment_id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  reviewer_ids: z.array(z.string()).optional(),
  due_date: z.string().optional(),
  status: AssessmentStatusEnum.optional(),
});

export function createAssessmentsUpdateTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_update',
    description: 'Update an existing assessment',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Updates the assessment',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: UpdateAssessmentSchema,
    handler: async (args: z.infer<typeof UpdateAssessmentSchema>) => {
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
  };
}
