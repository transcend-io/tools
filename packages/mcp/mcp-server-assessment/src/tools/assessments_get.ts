import {
  createToolResult,
  defineTool,
  derivePageInfo,
  OffsetPaginationSchema,
  z,
  type AssessmentComment,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';

/** Rows to pull per round trip when reading a comment query to the end. */
const COMMENT_FETCH_CHUNK = 100;

export const GetAssessmentSchema = z
  .object({
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
    includeComments: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'Include reviewer feedback and discussion threads. Comments on the form and on its ' +
          'sections always come back; comments left on individual questions need sectionIds, ' +
          'and commentSummary says so when they were left out. Default false.',
      ),
    includeResolvedComments: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'Also return comments already marked resolved. Most feedback on a mature form is ' +
          'resolved and rarely what a question is about. Ignored unless includeComments is ' +
          'true. Default false.',
      ),
  })
  .merge(OffsetPaginationSchema);
export type GetAssessmentInput = z.infer<typeof GetAssessmentSchema>;

/**
 * Read an offset-paginated comment query to the end.
 *
 * The three comment levels come from separate queries and are merged before
 * they can be ordered, so one page of the merged list cannot be assembled from
 * one page of each source — a comment ranked tenth overall may be the hundredth
 * of its own level. Reading each source out in full is what makes the merged
 * offset mean the same thing on every call.
 */
async function readAllComments(
  fetchPage: (
    offset: number,
    first: number,
  ) => Promise<{ nodes: AssessmentComment[]; totalCount: number }>,
): Promise<AssessmentComment[]> {
  const first = await fetchPage(0, COMMENT_FETCH_CHUNK);
  const all = [...first.nodes];
  while (all.length < first.totalCount) {
    const next = await fetchPage(all.length, COMMENT_FETCH_CHUNK);
    // A source that stops handing back rows before reaching its own totalCount
    // would otherwise spin here.
    if (next.nodes.length === 0) break;
    all.push(...next.nodes);
  }
  return all;
}

/**
 * Total order over the merged comment list.
 *
 * Offsets only name a stable comment if the ordering is total, and creation
 * time alone is not: comments posted in the same second would be free to swap
 * between calls and a page boundary would then skip one and repeat another.
 */
function byCreationThenId(a: AssessmentComment, b: AssessmentComment): number {
  return a.createdAt === b.createdAt
    ? a.id.localeCompare(b.id)
    : a.createdAt.localeCompare(b.createdAt);
}

/** Drop resolved comments unless asked for, order the rest, and cut one page. */
function pageComments(
  comments: AssessmentComment[],
  { includeResolved, limit, offset }: { includeResolved: boolean; limit: number; offset: number },
): {
  /** The requested page */
  page: AssessmentComment[];
  /** Comments matching the request across every page */
  totalCount: number;
} {
  const ordered = (includeResolved ? comments : comments.filter((c) => !c.resolvedAt)).sort(
    byCreationThenId,
  );
  return { page: ordered.slice(offset, offset + limit), totalCount: ordered.length };
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
      'feedback, which `limit` and `offset` move through — they page the comments, not the ' +
      'sections. Surface the returned `url` verbatim; never build assessment URLs from IDs.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetAssessmentSchema,
    handler: async ({
      assessmentId,
      sectionIds,
      includeComments,
      includeResolvedComments,
      limit,
      offset,
    }) => {
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
        readAllComments((o, first) =>
          graphql.listAssessmentFormComments(assessmentId, { first, offset: o }),
        ),
        readAllComments((o, first) =>
          graphql.listAssessmentSectionComments(
            sections.map((s) => s.id),
            { first, offset: o },
          ),
        ),
      ]);
      const questionComments = sections.flatMap(
        (section) => section.questions?.flatMap((q) => q.comments ?? []) ?? [],
      );
      const { page, totalCount } = pageComments(
        [...formComments, ...sectionComments, ...questionComments],
        { includeResolved: includeResolvedComments, limit, offset },
      );

      return createToolResult(true, {
        ...result,
        ...links,
        comments: page,
        commentSummary: {
          returned: page.length,
          totalCount,
          pageInfo: derivePageInfo({ offset, nodeCount: page.length, totalCount }),
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
