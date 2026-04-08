import {
  createToolResult,
  createListResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';
import { ListTemplatesSchema } from '../schemas.js';

export function createAssessmentsListTemplatesTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_list_templates',
    description:
      'List all available assessment templates. Note: Cursor pagination is not supported by the Transcend API for templates - use limit to control results (max 100).',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Results per page (1-100, default: 50)',
        },
        cursor: {
          type: 'string',
          description: 'Pagination cursor from previous response (where supported)',
        },
      },
      required: [],
    },
    handler: async (args) => {
      const parsed = validateArgs(ListTemplatesSchema, args);
      if (!parsed.success) return parsed.error;

      try {
        const result = await graphql.listAssessmentTemplates({
          first: parsed.data.limit,
          after: parsed.data.cursor,
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
