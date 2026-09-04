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
      'of questions, so expand only what you need. Reviewer feedback is counted here but read ' +
      'with assessments_list_comments. Surface the returned `url` verbatim; never build ' +
      'assessment URLs from IDs.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetAssessmentSchema,
    handler: async ({ assessmentId, sectionIds }) => {
      const expand = sectionIds !== undefined && sectionIds.length > 0;
      // Counts come from a separate pass because they are cheap at every level,
      // where the form query can only reach question comments through sections
      // the caller happened to expand. Counting separately is what stops the
      // total meaning one thing on a bare read and another on an expanded one.
      const [result, byLevel] = await Promise.all([
        expand
          ? graphql.getAssessment(assessmentId, { sectionIds, includeComments: false })
          : graphql.getAssessmentSkeleton(assessmentId),
        graphql.countAssessmentComments(assessmentId),
      ]);
      const links = buildAssessmentLinks({ dashboardUrl, assessmentFormId: result.id });
      const totalCount = byLevel.FORM + byLevel.SECTION + byLevel.QUESTION;

      return createToolResult(true, {
        ...result,
        ...links,
        commentSummary: {
          totalCount,
          byLevel,
          // Counts cover resolved and open alike, so this is the whole of the
          // feedback rather than the part still outstanding.
          includesResolved: true,
          ...(totalCount > 0
            ? {
                readWith:
                  'Call assessments_list_comments with this assessmentId to read the feedback, ' +
                  'filter it by author, or include the resolved ones.',
              }
            : {}),
        },
        ...(expand ? {} : { expandHint: 'Pass sectionIds to read the questions in a section.' }),
      });
    },
  });
}
