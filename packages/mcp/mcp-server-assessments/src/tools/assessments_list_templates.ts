import {
  createToolResult,
  createListResult,
  defineTool,
  PaginationSchema,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const ListTemplatesSchema = PaginationSchema;

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
    handler: async ({ limit, cursor }) => {
      try {
        const result = await graphql.listAssessmentTemplates({
          first: limit,
          after: cursor,
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
