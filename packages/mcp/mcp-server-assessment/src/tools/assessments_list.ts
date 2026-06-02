import {
  AssessmentSchema,
  createListResult,
  defineTool,
  listEnvelopeSchema,
  PaginationSchema,
  type ToolClients,
  z,
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
  .merge(PaginationSchema);
export type ListAssessmentsInput = z.infer<typeof ListAssessmentsSchema>;

export function createAssessmentsListTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_list',
    description:
      'List all privacy assessments in your organization. Supports filtering by status. Each row includes a `url` field with the canonical admin-dashboard link for that assessment — surface those to the user verbatim and do not construct assessment URLs from raw IDs. Note: Cursor pagination is not supported (max 100 results).',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListAssessmentsSchema,
    outputZodSchema: listEnvelopeSchema(AssessmentSchema),
    handler: async ({ status, limit, cursor }) => {
      const result = await graphql.listAssessments({
        first: limit,
        after: cursor,
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
