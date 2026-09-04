import {
  createToolResult,
  defineTool,
  derivePageInfo,
  ErrorCode,
  OffsetPaginationSchema,
  ToolError,
  z,
  type AssessmentComment,
  type AssessmentCommentLevel,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';

/** Rows to pull per round trip when reading a comment query to the end. */
const COMMENT_FETCH_CHUNK = 100;

export const ListAssessmentCommentsSchema = z
  .object({
    assessmentId: z
      .string()
      .describe(
        'ID of the assessment form whose feedback you want. Call assessments_list to look ' +
          'one up by title or status.',
      ),
    authorIds: z
      .array(z.string())
      .optional()
      .describe(
        'Only comments written by these people. Call admin_list_users to turn a name or ' +
          'email into an id, or assessments_list with includeDetails to see who is reviewing ' +
          'a form. Omit for every author.',
      ),
    resolution: z
      .enum(['OPEN', 'RESOLVED', 'ALL'])
      .optional()
      .default('OPEN')
      .describe(
        'OPEN returns only unresolved feedback, which is the feedback still asking for ' +
          'something. RESOLVED returns only what has been dealt with, ALL returns both. ' +
          'Default OPEN.',
      ),
    levels: z
      .array(z.enum(['FORM', 'SECTION', 'QUESTION']))
      .optional()
      .describe(
        'Only feedback left at these levels: FORM for the assessment as a whole, SECTION ' +
          'for one of its sections, QUESTION for a single question. Use QUESTION for "what ' +
          'did reviewers say about the answers". Omit for every level.',
      ),
  })
  .merge(OffsetPaginationSchema);
export type ListAssessmentCommentsInput = z.infer<typeof ListAssessmentCommentsSchema>;

/**
 * Read an offset-paginated comment query to the end. The three levels are
 * merged and ordered as one list, so a page can only be cut once every source
 * has been read — a page boundary in one source says nothing about the others.
 */
async function readAllComments(
  fetchPage: (
    offset: number,
    first: number,
  ) => Promise<{ nodes: AssessmentComment[]; totalCount: number }>,
): Promise<AssessmentComment[]> {
  const first = await fetchPage(0, COMMENT_FETCH_CHUNK);
  const all = [...first.nodes];
  while (all.length < first.totalCount && first.nodes.length > 0) {
    const next = await fetchPage(all.length, COMMENT_FETCH_CHUNK);
    if (next.nodes.length === 0) break;
    all.push(...next.nodes);
  }
  return all;
}

/**
 * Total order over the merged list. Creation time alone is not one: comments
 * written in the same second, which bulk review passes produce, would be free
 * to swap places between calls and make an offset name a different comment each
 * time. Ties fall back to id.
 */
function byCreationThenId(a: AssessmentComment, b: AssessmentComment): number {
  return a.createdAt === b.createdAt
    ? a.id.localeCompare(b.id)
    : a.createdAt.localeCompare(b.createdAt);
}

export function createAssessmentsListCommentsTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_list_comments',
    description:
      'Read the reviewer feedback on one assessment — the comments and discussion left on a ' +
      'PIA, DPIA, privacy review or vendor questionnaire. Returns feedback from all three ' +
      'levels at once, whether it was left on the form as a whole, on a section, or on a ' +
      'single question, each row saying which. Narrow with levels to one of those, authorIds ' +
      'to who wrote it, and resolution to whether it is still open. Use this rather than ' +
      'assessments_get, which reads the questions and answers and only counts the feedback.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListAssessmentCommentsSchema,
    handler: async ({ assessmentId, authorIds, resolution, levels, limit, offset }) => {
      const wanted = (level: AssessmentCommentLevel): boolean =>
        levels === undefined || levels.length === 0 || levels.includes(level);

      // This call both validates the form exists and yields the section ids, so
      // the other two levels can be read without a separate lookup. It also
      // carries the question comments, which have no query of their own.
      const questions = await graphql.listAssessmentQuestionComments(assessmentId);
      // A level nobody asked for is not read at all: on a form carrying
      // hundreds of comments, that is the difference between one round trip and
      // several.
      const [formComments, sectionComments] = await Promise.all([
        wanted('FORM')
          ? readAllComments((o, first) =>
              graphql.listAssessmentFormComments(assessmentId, { first, offset: o, authorIds }),
            )
          : [],
        wanted('SECTION')
          ? readAllComments((o, first) =>
              graphql.listAssessmentSectionComments(questions.sectionIds, {
                first,
                offset: o,
                authorIds,
              }),
            )
          : [],
      ]);

      // Question comments arrive nested on the form, which takes no filter
      // arguments, so the author filter is applied here for them. The other two
      // levels were filtered upstream, where the same match on author id makes
      // this a no-op rather than a second, looser pass.
      const matchesAuthor = (comment: AssessmentComment): boolean => {
        if (authorIds === undefined || authorIds.length === 0) return true;
        const id = comment.author?.id;
        return id !== undefined && authorIds.includes(id);
      };
      const matchesResolution = (comment: AssessmentComment): boolean =>
        resolution === 'ALL' ||
        (resolution === 'RESOLVED' ? comment.resolvedAt !== undefined : !comment.resolvedAt);

      const matched = [...formComments, ...sectionComments, ...questions.nodes]
        .filter(
          (comment) =>
            wanted(comment.level) && matchesAuthor(comment) && matchesResolution(comment),
        )
        .sort(byCreationThenId);

      const totalByLevel: Record<AssessmentCommentLevel, number> = {
        FORM: 0,
        SECTION: 0,
        QUESTION: 0,
      };
      for (const comment of matched) totalByLevel[comment.level] += 1;

      // An empty page from a non-zero offset is ambiguous: it looks identical to
      // filters that matched nothing. Fail the way assessments_list does, so the
      // agent corrects the offset instead of reporting the form has no feedback.
      if (offset > 0 && offset >= matched.length && matched.length > 0) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          `offset ${offset} is past the end of the result set: ${matched.length} ` +
            `comment(s) match resolution ${resolution}${
              authorIds && authorIds.length > 0 ? ` and the authorIds filter` : ''
            }. Retry with an offset below ${matched.length}.`,
          false,
          { offset, totalCount: matched.length, resolution, ...(authorIds && { authorIds }) },
        );
      }

      // Name what a comment sits on, so "which question is this about" does not
      // cost a second call into the form.
      const page = matched.slice(offset, offset + limit).map((comment) => {
        const title =
          comment.level === 'QUESTION'
            ? questions.questionTitles[comment.targetId]
            : comment.level === 'SECTION'
              ? questions.sectionTitles[comment.targetId]
              : undefined;
        if (title === undefined) return comment;
        return comment.level === 'QUESTION'
          ? { ...comment, questionTitle: title }
          : { ...comment, sectionTitle: title };
      });

      return createToolResult(true, {
        assessmentId,
        ...buildAssessmentLinks({ dashboardUrl, assessmentFormId: assessmentId }),
        comments: page,
        returned: page.length,
        totalCount: matched.length,
        totalByLevel,
        pageInfo: derivePageInfo({ offset, nodeCount: page.length, totalCount: matched.length }),
        ...(matched.length === 0
          ? {
              noMatches:
                resolution === 'OPEN'
                  ? 'This form has no open feedback matching the filters. Pass resolution ALL ' +
                    'to include feedback already resolved.'
                  : 'This form has no feedback matching the filters.',
            }
          : {}),
      });
    },
  });
}
