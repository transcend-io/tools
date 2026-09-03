import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentGroupUrl } from '../helpers/buildAssessmentLinks.js';

export const ListGroupsSchema = OffsetPaginationSchema.extend({
  text: z.string().optional().describe('Free-text match on the group title'),
  ids: z
    .array(z.string())
    .optional()
    .describe('Specific group IDs, e.g. the `assessmentGroupId` on an `assessments_list` row'),
  templateIds: z
    .array(z.string())
    .optional()
    .describe('Groups built from these templates; see `assessments_list_templates`'),
});
export type ListGroupsInput = z.infer<typeof ListGroupsSchema>;

export function createAssessmentsListGroupsTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_list_groups',
    description:
      'Find assessment groups, the containers that hold assessments and link them to a ' +
      'template. Use this to resolve a group by name into the `assessmentGroupId` that ' +
      '`assessments_create` needs. Each row carries the template it was built from, so this ' +
      'is also how you get from a form to its template: take `assessmentGroupId` off an ' +
      '`assessments_list` row, pass it as `ids` here, and read `assessmentFormTemplate`. ' +
      'Narrow with `text` rather than scanning pages. Page with `offset` (increment by `limit`) ' +
      'while `hasNextPage` is true. Surface the `groupUrl` on each row verbatim.',
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

      return createListResult(nodesWithLinks, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
