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
  questionText: z
    .string()
    .optional()
    .describe(
      'Return only the questions whose text matches this, with their answers, instead of ' +
        'whole sections. Use it to answer whether a form covers a topic — "retention", ' +
        '"third party" — without guessing which section holds it. Combine with sectionIds to ' +
        'search inside those sections.',
    ),
});
export type GetAssessmentInput = z.infer<typeof GetAssessmentSchema>;

export function createAssessmentsGetTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_get',
    description:
      'Read one filled-in assessment and the answers submitted to it. Given only assessmentId ' +
      'it returns the section list with a question count each, NOT the question text. To read ' +
      'the questions, either pass questionText to get just the ones on a topic wherever they ' +
      'sit, or sectionIds to expand whole sections; every sectionId must exist or the call ' +
      'fails, and reading the form in full means passing every one of them. Surface the ' +
      'returned `url` verbatim; never build assessment URLs from IDs.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetAssessmentSchema,
    handler: async ({ assessmentId, sectionIds, questionText }) => {
      const search = questionText !== undefined && questionText.length > 0;
      const expand = !search && sectionIds !== undefined && sectionIds.length > 0;
      const read = search
        ? await graphql.searchAssessmentQuestions(assessmentId, questionText, { sectionIds })
        : expand
          ? await graphql.getAssessment(assessmentId, { sectionIds })
          : await graphql.getAssessmentSkeleton(assessmentId);
      const found = 'matches' in read ? read : undefined;
      const result = found ? found.form : (read as Assessment);

      return createToolResult(true, {
        ...result,
        ...buildAssessmentLinks({ dashboardUrl, assessmentFormId: result.id }),
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
