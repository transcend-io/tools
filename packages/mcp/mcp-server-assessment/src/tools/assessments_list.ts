import {
  assertOffsetInRange,
  createListResult,
  defineTool,
  describeNoMatches,
  z,
  OffsetPaginationSchema,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { AssessmentFormStatus } from '@transcend-io/privacy-types';

import type { AssessmentsMixin, ListAssessmentsSortField } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';

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

/**
 * An optional list filter that rejects `[]`.
 *
 * Empty arrays are dropped during filter assembly, so a caller that resolved a
 * lookup to nothing and passed the result through would have its filter read as
 * "no filter given" and get back every assessment in the organization — the
 * widest possible answer to a query that should have matched none.
 */
const idList = (description: string) =>
  z
    .array(z.string())
    .min(1, { message: 'Pass at least one value, or omit the filter entirely.' })
    .optional()
    .describe(description);

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
      .min(1, { message: 'Pass at least one status, or omit the filter entirely.' })
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
    externalAssigneeEmails: idList('Email addresses of external (vendor) assignees'),
    assessmentGroupIds: idList('Groups the forms belong to; see `assessments_list_groups`'),
    createdAfter: isoDate('createdAfter').describe('Only forms created strictly after this date'),
    createdBefore: isoDate('createdBefore').describe('Only forms created on or before this date'),
    dueAfter: isoDate('dueAfter').describe('Only forms due strictly after this date'),
    dueBefore: isoDate('dueBefore').describe(
      'Only forms due on or before this date. Use for overdue.',
    ),
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
      .describe('Also return assignees, reviewers, due/updated/submitted dates and lock state.'),
  })
  .merge(OffsetPaginationSchema);
export type ListAssessmentsInput = z.infer<typeof ListAssessmentsSchema>;

export function createAssessmentsListTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_list',
    description:
      'List all assessments in your organization. ' +
      'Surface the `url` on each row verbatim; never build assessment URLs from IDs.',
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
        ...(assessmentGroupIds?.length && { assessmentGroupIds }),
        ...(createdAfter && { createdAtAfter: createdAfter }),
        ...(createdBefore && { createdAtBefore: createdBefore }),
        ...(dueAfter && { dueDateAfter: dueAfter }),
        ...(dueBefore && { dueDateBefore: dueBefore }),
      };
      // Named as the caller passed them. Reporting the API's own field names
      // sent an agent looking for a `dueDateAfter` argument this tool does not
      // have.
      const appliedFilters = Object.entries({
        statuses: statuses?.length,
        text,
        ids: ids?.length,
        assigneeIds: assigneeIds?.length,
        reviewerIds: reviewerIds?.length,
        externalAssigneeEmails: externalAssigneeEmails?.length,
        assessmentGroupIds: assessmentGroupIds?.length,
        createdAfter,
        createdBefore,
        dueAfter,
        dueBefore,
      })
        .filter(([, value]) => Boolean(value))
        .map(([name]) => name);

      const result = await graphql.listAssessments({
        first: limit,
        offset,
        filterBy,
        includeDetails,
        ...(sortBy && { sortField: SORT_FIELDS[sortBy], sortDirection }),
      });

      const totalCount = result.totalCount ?? 0;

      assertOffsetInRange({ subject: 'assessment', offset, totalCount, appliedFilters });

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
  if (totalCount === 0) return describeNoMatches('assessments', appliedFilters);
  if (offset + returned < totalCount) {
    return `Showing ${returned} of ${totalCount} matches. Fetch the next page with offset ${
      offset + limit
    }.`;
  }
  return offset === 0
    ? `Showing all ${returned} match${returned === 1 ? '' : 'es'}. No further pages.`
    : `Showing the last ${returned} of ${totalCount} matches. No further pages.`;
}
