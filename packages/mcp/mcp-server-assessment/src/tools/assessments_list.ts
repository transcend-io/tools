import {
  createListResult,
  defineTool,
  z,
  PaginationSchema,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { AssessmentFormStatus } from '@transcend-io/privacy-types';

import type { AssessmentsMixin } from '../graphql.js';

export const AssessmentStatusEnum = z.nativeEnum(AssessmentFormStatus);
export type AssessmentStatusEnumInput = z.infer<typeof AssessmentStatusEnum>;

export const ListAssessmentsSchema = z
  .object({
    status: AssessmentStatusEnum.optional().describe('Filter by assessment status'),
  })
  .merge(PaginationSchema);
export type ListAssessmentsInput = z.infer<typeof ListAssessmentsSchema>;

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
      const result = await graphql.listAssessments({
        first: limit,
        after: cursor,
        filterBy: status ? { statuses: [status] } : undefined,
      });

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
