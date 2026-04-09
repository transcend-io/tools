import {
  createToolResult,
  createListResult,
  defineTool,
  z,
  PaginationSchema,
  type ToolClients,
} from '@transcend-io/mcp-server-core';
import { AssessmentFormStatus } from '@transcend-io/privacy-types';

import type { AssessmentsMixin } from '../graphql.js';

const AssessmentStatusEnum = z.nativeEnum(AssessmentFormStatus);

const ListAssessmentsSchema = z
  .object({
    status: AssessmentStatusEnum.optional().describe('Filter by assessment status'),
  })
  .merge(PaginationSchema);

export function createAssessmentsListTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_list',
    description:
      'List all privacy assessments in your organization. Supports filtering by status. Note: Cursor pagination is not supported (max 100 results).',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListAssessmentsSchema,
    handler: async ({ status, limit, cursor }) => {
      try {
        const result = await graphql.listAssessments({
          first: limit,
          after: cursor,
          filterBy: status ? { statuses: [status] } : undefined,
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
  });
}
