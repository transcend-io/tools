import {
  createToolResult,
  createListResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';
import { ListAssessmentsSchema } from '../schemas.js';

export function createAssessmentsListTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_list',
    description:
      'List all privacy assessments in your organization. Supports filtering by status. Note: Cursor pagination is not supported (max 100 results).',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by assessment status',
          enum: [
            'DRAFT',
            'SHARED',
            'IN_PROGRESS',
            'IN_REVIEW',
            'CHANGES_REQUESTED',
            'REJECTED',
            'APPROVED',
          ],
        },
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
      const parsed = validateArgs(ListAssessmentsSchema, args);
      if (!parsed.success) return parsed.error;

      try {
        const result = await graphql.listAssessments({
          first: parsed.data.limit,
          after: parsed.data.cursor,
          filterBy: parsed.data.status ? { statuses: [parsed.data.status] } : undefined,
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
