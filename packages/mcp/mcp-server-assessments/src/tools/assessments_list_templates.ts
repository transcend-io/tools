import {
  createToolResult,
  createListResult,
  z,
  PaginationSchema,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const ListTemplatesSchema = PaginationSchema;

export function createAssessmentsListTemplatesTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_list_templates',
    description:
      'List all available assessment templates. Note: Cursor pagination is not supported by the Transcend API for templates - use limit to control results (max 100).',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListTemplatesSchema,
    handler: async (args: z.infer<typeof ListTemplatesSchema>) => {
      try {
        const result = await graphql.listAssessmentTemplates({
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
