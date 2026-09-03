import {
  createToolResult,
  defineTool,
  z,
  type AssessmentComment,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';

/**
 * Ceiling on comments returned in one call. A form under active review
 * accumulates comments faster than anything else on it, and the API's nested
 * question `comments` field takes no pagination arguments, so the cap has to be
 * applied here.
 */
const MAX_COMMENTS = 200;

export const GetAssessmentSchema = z.object({
  assessmentId: z
    .string()
    .describe(
      'ID of the assessment form (PIA, DPIA, privacy review, vendor questionnaire) to read. ' +
        'Call assessments_list to look one up by title or status.',
    ),
  sectionIds: z
    .array(z.string())
    .optional()
    .describe(
      'Expand these sections, returning their questions, answer options and submitted answers ' +
        'in full. Omit on the first call: you get the section list back and pick from it. A whole ' +
        'form can run to hundreds of questions, far more than fits in one response.',
    ),
  includeComments: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Include reviewer feedback and discussion threads. Comments on the form and on its ' +
        'sections always come back in full; comments left on individual questions need ' +
        'sectionIds, and commentSummary says so when they were left out. Default false.',
    ),
  includeResolvedComments: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Also return comments already marked resolved. Most feedback on a mature form is resolved ' +
        'and rarely what a question is about. Ignored unless includeComments is true. Default false.',
    ),
});
export type GetAssessmentInput = z.infer<typeof GetAssessmentSchema>;

/** Drop resolved comments and cap the rest, reporting whether anything was cut. */
function capComments(
  comments: AssessmentComment[],
  includeResolved: boolean,
): {
  /** Comments to return */
  kept: AssessmentComment[];
  /** How many were dropped by the cap */
  omitted: number;
} {
  const filtered = includeResolved ? comments : comments.filter((c) => !c.resolvedAt);
  return {
    kept: filtered.slice(0, MAX_COMMENTS),
    omitted: Math.max(0, filtered.length - MAX_COMMENTS),
  };
}

export function createAssessmentsGetTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_get',
    description:
      'Read one filled-in assessment — a PIA, DPIA, privacy review or vendor questionnaire — ' +
      'in two calls. Given only assessmentId it returns the section list with a question count ' +
      'each, NOT the question text. Pass sectionIds to expand those sections into their ' +
      'questions, submitted answers and question-level comments; a whole form can run to ' +
      'hundreds of questions, so expand only what you need. Set includeComments for reviewer ' +
      'feedback. For a blank template instead of a filled-in form, use ' +
      'assessments_export_template. ' +
      'Surface the returned `url` verbatim; never build assessment URLs from IDs.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetAssessmentSchema,
    handler: async ({ assessmentId, sectionIds, includeComments, includeResolvedComments }) => {
      const expand = sectionIds !== undefined && sectionIds.length > 0;
      const result = expand
        ? await graphql.getAssessment(assessmentId, { sectionIds, includeComments })
        : await graphql.getAssessmentSkeleton(assessmentId);
      const links = buildAssessmentLinks({ dashboardUrl, assessmentFormId: result.id });

      if (!includeComments) {
        return createToolResult(true, {
          ...result,
          ...links,
          ...(expand ? {} : { expandHint: 'Pass sectionIds to read the questions in a section.' }),
        });
      }

      // Form and section comments are bounded by the number of sections, so
      // they come back whether or not the caller expanded anything — asking for
      // feedback and silently getting only part of it is worse than the round
      // trip. Question comments are the unbounded axis and stay behind
      // sectionIds.
      const sections = result.sections ?? [];
      const [formComments, sectionComments] = await Promise.all([
        graphql.listAssessmentFormComments(assessmentId, { first: 100 }),
        graphql.listAssessmentSectionComments(
          sections.map((s) => s.id),
          { first: 100 },
        ),
      ]);
      const questionComments = sections.flatMap(
        (section) => section.questions?.flatMap((q) => q.comments ?? []) ?? [],
      );
      const { kept, omitted } = capComments(
        [...formComments.nodes, ...sectionComments.nodes, ...questionComments],
        includeResolvedComments,
      );

      return createToolResult(true, {
        ...result,
        ...links,
        comments: kept,
        commentSummary: {
          returned: kept.length,
          ...(omitted > 0 && { omittedByLimit: omitted }),
          ...(includeResolvedComments ? {} : { resolvedHidden: true }),
          // Say what is missing rather than letting a partial answer look whole.
          ...(expand
            ? { questionCommentsFrom: sections.map((s) => s.id) }
            : {
                questionCommentsOmitted:
                  'Form and section comments are complete. Comments left on individual ' +
                  'questions are not included — re-call with sectionIds to read those.',
              }),
        },
        ...(expand ? {} : { expandHint: 'Pass sectionIds to read the questions in a section.' }),
      });
    },
  });
}
