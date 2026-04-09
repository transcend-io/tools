import {
  createToolResult,
  createListResult,
  z,
  PaginationSchema,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const ListGroupsSchema = PaginationSchema;

export function createAssessmentsListGroupsTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_list_groups',
    description:
      'List all assessment groups. Groups are containers for assessments and are linked to templates. Use this to find the right group ID for creating assessments.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListGroupsSchema,
    handler: async (args: z.infer<typeof ListGroupsSchema>) => {
      try {
        const result = await graphql.listAssessmentGroups({
          first: args.limit,
          after: args.cursor,
        });

        return createListResult(result.nodes, {
          totalCount: result.totalCount,
          hasNextPage: result.pageInfo?.hasNextPage,
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}
