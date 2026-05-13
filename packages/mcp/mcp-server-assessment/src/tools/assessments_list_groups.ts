import {
  AssessmentGroupSchema,
  createListResult,
  defineTool,
  listEnvelopeSchema,
  PaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';

export const ListGroupsSchema = PaginationSchema;
export type ListGroupsInput = z.infer<typeof ListGroupsSchema>;

export function createAssessmentsListGroupsTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_list_groups',
    description:
      'List all assessment groups. Groups are containers for assessments and are linked to templates. Use this to find the right group ID for creating assessments.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListGroupsSchema,
    outputZodSchema: listEnvelopeSchema(AssessmentGroupSchema),
    handler: async ({ limit, cursor }) => {
      const result = await graphql.listAssessmentGroups({
        first: limit,
        after: cursor,
      });

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
