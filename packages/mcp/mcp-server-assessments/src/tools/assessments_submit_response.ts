import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const SubmitResponseSchema = z.object({
  assessment_id: z.string().describe('ID of the assessment to submit for review'),
  assessment_section_ids: z
    .array(z.string())
    .describe('Array of section IDs to submit for review. Required by the API.'),
});

export function createAssessmentsSubmitResponseTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_submit_response',
    description:
      'Submit an assessment form for review. Optionally specify which sections to submit. This transitions the assessment toward the IN_REVIEW status.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Submits assessment for review — cannot be undone',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: SubmitResponseSchema,
    handler: async ({ assessment_id, assessment_section_ids }) => {
      const result = await graphql.submitAssessmentForReview({
        id: assessment_id,
        assessmentSectionIds: assessment_section_ids,
      });

      return createToolResult(true, {
        assessment: result,
        message: 'Assessment submitted for review successfully',
      });
    },
  });
}
