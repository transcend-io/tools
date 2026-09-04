import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';

export const GetAssessmentSchema = z.object({
  assessmentId: z
    .string()
    .describe(
      'ID of the assessment form to read. Call assessments_list to look one up by title ' +
        'or status.',
    ),
  sectionIds: z
    .array(z.string())
    .optional()
    .describe(
      'Expand these sections, returning their questions, answer options and submitted ' +
        'answers in full. Omit on the first call: you get the section list back and pick from ' +
        'it. A whole form can run to hundreds of questions, far more than fits in one response.',
    ),
});
export type GetAssessmentInput = z.infer<typeof GetAssessmentSchema>;

export function createAssessmentsGetTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_get',
    description:
      'Read one filled-in assessment — a PIA, DPIA, privacy review or vendor questionnaire — ' +
      'and the answers submitted to it. Given only assessmentId it returns the section list ' +
      'with a question count each, NOT the question text. Pass sectionIds to expand those ' +
      'sections into their questions and submitted answers; a whole form can run to hundreds ' +
      'of questions, so expand only what you need, and pass every sectionId from that list to ' +
      'read the form in full. There is no flag for that. Every sectionId must exist or the ' +
      'call fails. Surface the returned `url` verbatim; never build assessment URLs from IDs.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetAssessmentSchema,
    handler: async ({ assessmentId, sectionIds }) => {
      const expand = sectionIds !== undefined && sectionIds.length > 0;
      const result = expand
        ? await graphql.getAssessment(assessmentId, { sectionIds })
        : await graphql.getAssessmentSkeleton(assessmentId);

      return createToolResult(true, {
        ...result,
        ...buildAssessmentLinks({ dashboardUrl, assessmentFormId: result.id }),
        ...(expand ? {} : { expandHint: 'Pass sectionIds to read the questions in a section.' }),
      });
    },
  });
}
