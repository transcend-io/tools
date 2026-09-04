import {
  createListResult,
  defineTool,
  ErrorCode,
  ToolError,
  z,
  OffsetPaginationSchema,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { AssessmentFormStatus } from '@transcend-io/privacy-types';

import type { AssessmentsMixin, ListAssessmentsSortField } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';

/**
 * Three-query test. An agent holding only the tool list — no repo, no prior
 * calls — should land on this tool, and only this tool, for each of these:
 *
 * 1. "Which privacy reviews are sitting with me to approve?"
 *    Reaches `reviewerIds` plus an IN_REVIEW status. Requires the description
 *    to say reviewers are filterable, and requires the caller to have resolved
 *    their own user ID via `admin_list_users` first, which the `reviewerIds`
 *    description points at.
 *
 * 2. "Any vendor assessments overdue and still not approved?"
 *    Reaches `dueBefore` with a `statuses` list that omits APPROVED. If the
 *    tool text does not say due dates are filterable server-side, an agent
 *    pages the whole index and filters locally, which is the failure this
 *    tool's filter set exists to prevent.
 *
 * 3. "How many assessments came out of the Vendor Onboarding template this
 *    quarter?"
 *    Reaches `templateIds` (resolved through `assessments_list_templates`) and
 *    `createdAfter`. Answerable from `totalCount` without paging, which is why
 *    `totalCount` is documented as the match count rather than the page count.
 *
 * The neighbours this must not be confused with: `assessments_list_groups`
 * returns the containers, `assessments_list_templates` returns blank templates,
 * and `assessments_get` returns one form's questions and answers.
 */

export const AssessmentStatusEnum = z.nativeEnum(AssessmentFormStatus);
export type AssessmentStatusEnumInput = z.infer<typeof AssessmentStatusEnum>;

/**
 * Accepts a bare date or a full timestamp, since the GraphQL `Date` scalar
 * takes both and callers phrase deadlines either way.
 */
const isoDate = (field: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}([T ].*)?$/, {
      message: `${field} must be an ISO 8601 date, e.g. 2026-01-31 or 2026-01-31T00:00:00Z`,
    })
    .optional();

const idList = (description: string) => z.array(z.string()).optional().describe(description);

/** Caller-facing sort names mapped onto `AssessmentFormRawOrderField`. */
const SORT_FIELDS: Record<string, ListAssessmentsSortField> = {
  title: 'title',
  status: 'statusRank',
  submittedAt: 'submittedAt',
};

export const ListAssessmentsSchema = z
  .object({
    statuses: z
      .array(AssessmentStatusEnum)
      .optional()
      .describe('Lifecycle statuses to include. Omit for every status.'),
    text: z.string().optional().describe('Free-text match on the assessment title'),
    ids: idList('Specific assessment form IDs to fetch'),
    assigneeIds: idList(
      'Transcend user IDs the form is assigned to. Resolve names with `admin_list_users`.',
    ),
    reviewerIds: idList(
      'Transcend user IDs reviewing the form. Resolve names with `admin_list_users`.',
    ),
    externalAssigneeEmails: z
      .array(z.string())
      .optional()
      .describe('Email addresses of external (vendor) assignees'),
    templateIds: idList('Templates the forms were built from; see `assessments_list_templates`'),
    assessmentGroupIds: idList('Groups the forms belong to; see `assessments_list_groups`'),
    createdAfter: isoDate('createdAfter').describe('Only forms created on or after this date'),
    createdBefore: isoDate('createdBefore').describe('Only forms created before this date'),
    dueAfter: isoDate('dueAfter').describe('Only forms due on or after this date'),
    dueBefore: isoDate('dueBefore').describe('Only forms due before this date. Use for overdue.'),
    sortBy: z
      .enum(['title', 'status', 'submittedAt'], {
        message: 'sortBy must be one of: title, status, submittedAt',
      })
      .optional()
      .describe(
        'Column to sort on; the API offers no creation-date sort. Omit for its default order.',
      ),
    sortDirection: z
      .enum(['ASC', 'DESC'], { message: 'sortDirection must be ASC or DESC' })
      .optional()
      .default('ASC')
      .describe('Sort direction. Only applied alongside `sortBy`.'),
    includeDetails: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'Also return assignees, reviewers, due/updated/submitted dates and lock state. ' +
          'Roughly triples the size of each row.',
      ),
  })
  .merge(OffsetPaginationSchema);
export type ListAssessmentsInput = z.infer<typeof ListAssessmentsSchema>;

export function createAssessmentsListTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_list',
    description:
      'Find privacy assessments — PIAs, DPIAs, privacy reviews, vendor questionnaires — by ' +
      'status, text, assignee, reviewer, template, group, creation or due date. Each row has ' +
      'id, title, status, createdAt, assessmentGroupId and url; `includeDetails` adds ' +
      'assignees, reviewers and further dates. There is no creation-date sort, so order by ' +
      'createdAt yourself for oldest-first. `assessments_get` reads one form in full, ' +
      '`assessments_list_groups` the containers, `assessments_list_templates` blank templates. ' +
      '`totalCount` counts every match, not this page. ' +
      'Surface each `url` verbatim; never build assessment URLs from IDs.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListAssessmentsSchema,
    handler: async ({
      statuses,
      text,
      ids,
      assigneeIds,
      reviewerIds,
      externalAssigneeEmails,
      templateIds,
      assessmentGroupIds,
      createdAfter,
      createdBefore,
      dueAfter,
      dueBefore,
      sortBy,
      sortDirection,
      includeDetails,
      limit,
      offset,
    }) => {
      const filterBy = {
        ...(statuses?.length && { statuses }),
        ...(text && { text }),
        ...(ids?.length && { ids }),
        ...(assigneeIds?.length && { assigneeIds }),
        ...(reviewerIds?.length && { reviewerIds }),
        ...(externalAssigneeEmails?.length && { externalAssigneeEmails }),
        ...(templateIds?.length && { templateIds }),
        ...(assessmentGroupIds?.length && { assessmentGroupIds }),
        ...(createdAfter && { createdAtAfter: createdAfter }),
        ...(createdBefore && { createdAtBefore: createdBefore }),
        ...(dueAfter && { dueDateAfter: dueAfter }),
        ...(dueBefore && { dueDateBefore: dueBefore }),
      };
      const appliedFilters = Object.keys(filterBy);

      const result = await graphql.listAssessments({
        first: limit,
        offset,
        filterBy,
        includeDetails,
        ...(sortBy && { sortField: SORT_FIELDS[sortBy], sortDirection }),
      });

      const totalCount = result.totalCount ?? 0;

      // An empty page from a non-zero offset is ambiguous: it looks identical to
      // filters that matched nothing. Fail loudly so the agent corrects the
      // offset instead of concluding no assessments exist.
      if (offset > 0 && offset >= totalCount) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          `offset ${offset} is past the end of the result set: ${totalCount} ` +
            `assessment(s) match ${
              appliedFilters.length > 0
                ? `the filters (${appliedFilters.join(', ')})`
                : 'with no filters applied'
            }. Retry with an offset below ${totalCount}.`,
          false,
          { offset, totalCount, appliedFilters },
        );
      }

      const nodesWithLinks = result.nodes.map((node) => ({
        ...node,
        ...buildAssessmentLinks({ dashboardUrl, assessmentFormId: node.id }),
      }));

      return createListResult(nodesWithLinks, {
        totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
        paginationNote: describeOutcome({
          returned: nodesWithLinks.length,
          totalCount,
          offset,
          limit,
          appliedFilters,
        }),
      });
    },
  });
}

/**
 * Tells the caller which of three situations it is in: nothing matched, more
 * pages remain, or this is everything. Without this an empty `data` array reads
 * the same as a filter typo, and the agent reports "no assessments" to the user.
 */
function describeOutcome({
  returned,
  totalCount,
  offset,
  limit,
  appliedFilters,
}: {
  /** Rows on this page */
  returned: number;
  /** Rows matching the filters overall */
  totalCount: number;
  /** Offset this page started at */
  offset: number;
  /** Page size requested */
  limit: number;
  /** Names of the filters that were forwarded to the API */
  appliedFilters: string[];
}): string {
  if (totalCount === 0) {
    return appliedFilters.length > 0
      ? `No assessments match the filters applied (${appliedFilters.join(', ')}). ` +
          'The query succeeded; relax or drop a filter rather than retrying it unchanged.'
      : 'This organization has no assessments. The query succeeded.';
  }
  if (offset + returned < totalCount) {
    return `Showing ${returned} of ${totalCount} matches. Fetch the next page with offset ${
      offset + limit
    }.`;
  }
  return offset === 0
    ? `Showing all ${returned} match${returned === 1 ? '' : 'es'}. No further pages.`
    : `Showing the last ${returned} of ${totalCount} matches. No further pages.`;
}
