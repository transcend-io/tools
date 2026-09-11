import {
  createToolResult,
  defineTool,
  z,
  type Assessment,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';

export const GetAssessmentSchema = z.object({
  assessmentId: z.string().describe('Assessment form ID (from assessments_list)'),
  sectionIds: z
    .array(z.string())
    .optional()
    .describe('Expand these sections with questions and answers; omit for section list only'),
  questionText: z
    .string()
    .optional()
    .describe('Return matching questions/answers by text instead of whole sections'),
});
export type GetAssessmentInput = z.infer<typeof GetAssessmentSchema>;

export function createAssessmentsGetTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_get',
    description:
      'Read one assessment. With only assessmentId returns sections and question counts (not ' +
      'question text). Pass sectionIds to expand sections, or questionText to search. Feedback ' +
      'counts here; use assessments_list_comments to read comments. Use returned `url` as-is.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetAssessmentSchema,
    handler: async ({ assessmentId, sectionIds, questionText }) => {
      const search = questionText !== undefined && questionText.length > 0;
      const expand = !search && sectionIds !== undefined && sectionIds.length > 0;
      // Counts come from a separate pass because they are cheap at every level,
      // where the form query can only reach question comments through sections
      // the caller happened to expand. Counting separately is what stops the
      // total meaning one thing on a bare read and another on an expanded one.
      const [read, byLevel] = await Promise.all([
        search
          ? graphql.searchAssessmentQuestions(assessmentId, questionText, { sectionIds })
          : expand
            ? graphql.getAssessment(assessmentId, { sectionIds })
            : graphql.getAssessmentSkeleton(assessmentId),
        graphql.countAssessmentComments(assessmentId),
      ]);
      const found = 'matches' in read ? read : undefined;
      const result = found ? found.form : (read as Assessment);
      const links = buildAssessmentLinks({ dashboardUrl, assessmentFormId: result.id });
      const totalCount = byLevel.FORM + byLevel.SECTION + byLevel.QUESTION;

      return createToolResult(true, {
        ...result,
        ...links,
        ...(found && {
          questionMatches: found.matches,
          // A search that found nothing is a real answer — the form does not
          // ask about this — but only if it cannot be mistaken for a failure.
          ...(found.matches.length > 0
            ? {
                matchNote:
                  `${found.matches.length} of ${found.searchedCount} question(s) match ` +
                  `"${questionText}". Answers are included; the sections list shows what else ` +
                  'the form asks.',
              }
            : {
                noMatches:
                  `The search succeeded: no question out of ${found.searchedCount} matches ` +
                  `"${questionText}". Try a broader term before concluding the form omits the ` +
                  'topic, since this matches question text rather than answers.',
              }),
        }),
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
        ...(expand || search
          ? {}
          : {
              expandHint:
                'Pass sectionIds to read the questions in a section, or questionText to find ' +
                'the questions on a topic across the whole form.',
            }),
      });
    },
  });
}
