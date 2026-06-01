import {
  createListResult,
  defineTool,
  PaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentGroupUrl } from '../helpers/buildAssessmentLinks.js';

export const ListGroupsSchema = PaginationSchema;
export type ListGroupsInput = z.infer<typeof ListGroupsSchema>;

export function createAssessmentsListGroupsTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_list_groups',
    description:
      'List all assessment groups. Groups are containers for assessments and are linked to templates. Use this to find the right group ID for creating assessments. Each row includes a `groupUrl` field with the canonical admin-dashboard link — surface those to the user verbatim.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListGroupsSchema,
    handler: async ({ limit, cursor }) => {
      const result = await graphql.listAssessmentGroups({
        first: limit,
        after: cursor,
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
