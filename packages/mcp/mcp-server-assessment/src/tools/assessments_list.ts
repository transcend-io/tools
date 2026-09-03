import {
  createListResult,
  defineTool,
  z,
  PaginationSchema,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { AssessmentFormStatus } from '@transcend-io/privacy-types';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';

export const AssessmentStatusEnum = z.nativeEnum(AssessmentFormStatus);
export type AssessmentStatusEnumInput = z.infer<typeof AssessmentStatusEnum>;

export const ListAssessmentsSchema = z
  .object({
    status: AssessmentStatusEnum.optional().describe('Filter by assessment status'),
  })
  .merge(PaginationSchema.omit({ cursor: true }));
export type ListAssessmentsInput = z.infer<typeof ListAssessmentsSchema>;

export function createAssessmentsListTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_list',
    description:
      'List all privacy assessments in your organization. Supports filtering by status. ' +
      'Returns at most `limit` rows (max 100). ' +
      'Surface the `url` on each row verbatim; never build assessment URLs from IDs.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListAssessmentsSchema,
    handler: async ({ status, limit }) => {
      const result = await graphql.listAssessments({
        first: limit,
        filterBy: status ? { statuses: [status] } : undefined,
      });

      const nodesWithLinks = result.nodes.map((node) => ({
        ...node,
        ...buildAssessmentLinks({ dashboardUrl, assessmentFormId: node.id }),
      }));

      return createListResult(nodesWithLinks, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
