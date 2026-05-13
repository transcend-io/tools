import {
  AssessmentTemplateSchema,
  createListResult,
  defineTool,
  listEnvelopeSchema,
  PaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';

export const ListTemplatesSchema = PaginationSchema;
export type ListTemplatesInput = z.infer<typeof ListTemplatesSchema>;

export function createAssessmentsListTemplatesTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_list_templates',
    description:
      'List all available assessment templates. Note: Cursor pagination is not supported by the Transcend API for templates - use limit to control results (max 100).',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListTemplatesSchema,
    outputZodSchema: listEnvelopeSchema(AssessmentTemplateSchema),
    handler: async ({ limit, cursor }) => {
      const result = await graphql.listAssessmentTemplates({
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
