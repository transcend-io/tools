import {
  assertOffsetInRange,
  createListResult,
  defineTool,
  describeOutcome,
  nonEmptyList,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentGroupUrl } from '../helpers/buildAssessmentLinks.js';

export const ListGroupsSchema = OffsetPaginationSchema.extend({
  text: z.string().optional().describe('Free-text match on the group title and description'),
  ids: nonEmptyList(
    'Specific group IDs, e.g. the `assessmentGroupId` on an `assessments_list` row',
    'group ID',
  ),
  templateIds: nonEmptyList(
    'Groups built from these templates; see `assessments_list_templates`',
    'template ID',
  ),
});
export type ListGroupsInput = z.infer<typeof ListGroupsSchema>;

export function createAssessmentsListGroupsTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_list_groups',
    description:
      'List all assessment groups. Groups are containers for assessments and are linked to ' +
      'templates. Use this to find the right group ID for creating assessments. To reach the ' +
      'template behind a form, pass its `assessmentGroupId` as `ids` and read ' +
      '`assessmentFormTemplate`. ' +
      'Surface the `groupUrl` on each row verbatim.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListGroupsSchema,
    handler: async ({ limit, offset, text, ids, templateIds }) => {
      const result = await graphql.listAssessmentGroups({
        first: limit,
        offset,
        filterBy: {
          ...(text && { text }),
          ...(ids?.length && { ids }),
          ...(templateIds?.length && { templateIds }),
        },
      });

      const nodesWithLinks = result.nodes.map((node) => ({
        ...node,
        groupUrl: buildAssessmentGroupUrl(dashboardUrl, node.id),
      }));

      const appliedFilters = Object.entries({
        text,
        ids: ids?.length,
        templateIds: templateIds?.length,
      })
        .filter(([, value]) => Boolean(value))
        .map(([name]) => name);

      const totalCount = result.totalCount ?? 0;
      assertOffsetInRange({ subject: 'assessment group', offset, totalCount, appliedFilters });

      return createListResult(nodesWithLinks, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
        paginationNote: describeOutcome({
          subject: 'assessment groups',
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
