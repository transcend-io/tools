import {
  createToolResult,
  z,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const SubmitResponseSchema = z.object({
  assessment_id: z.string(),
  assessment_section_ids: z.array(z.string()),
});

export function createAssessmentsSubmitResponseTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_submit_response',
    description:
      'Submit an assessment form for review. Optionally specify which sections to submit. This transitions the assessment toward the IN_REVIEW status.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Submits assessment for review — cannot be undone',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: SubmitResponseSchema,
    handler: async (args: z.infer<typeof SubmitResponseSchema>) => {
      try {
        const result = await graphql.submitAssessmentForReview({
          id: args.assessment_id,
          assessmentSectionIds: args.assessment_section_ids,
        });

        return createToolResult(true, {
          assessment: result,
          message: 'Assessment submitted for review successfully',
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
