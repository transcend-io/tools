import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';

export const SubmitResponseSchema = z.object({
  assessmentId: z.string().describe('ID of the assessment to submit for review'),
  assessmentSectionIds: z
    .array(z.string())
    .describe('Array of section IDs to submit for review. Required by the API.'),
});
export type SubmitResponseInput = z.infer<typeof SubmitResponseSchema>;

export function createAssessmentsSubmitResponseTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_submit_response',
    description:
      'Submit an assessment form for review. Optionally specify which sections to submit. This transitions the assessment toward the IN_REVIEW status. The response includes a `url` field pointing at the assessment-group page where reviewers can find the submitted form — surface that to the user verbatim and do not construct assessment URLs from raw IDs.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Submits assessment for review — cannot be undone',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: SubmitResponseSchema,
    handler: async ({ assessmentId, assessmentSectionIds }) => {
      const result = await graphql.submitAssessmentForReview({
        id: assessmentId,
        assessmentSectionIds,
      });

      const links = buildAssessmentLinks({ dashboardUrl, assessmentFormId: result.id });

      return createToolResult(true, {
        assessment: { ...result, ...links },
        ...links,
        message: `Assessment submitted for review successfully. View it at ${links.url}`,
      });
    },
  });
}
