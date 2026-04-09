import {
  createListResult,
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { WorkflowsMixin } from '../graphql.js';
import { ListEmailTemplatesSchema } from '../schemas.js';

export function createWorkflowsListEmailTemplatesTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as WorkflowsMixin;
  return {
    name: 'workflows_list_email_templates',
    description:
      'List all email templates used in workflows and communications. Note: API does not support cursor pagination (max ~100 results).',
    category: 'Workflows',
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
        offset: {
          type: 'number',
          description: 'Number of results to skip (default: 0)',
        },
      },
      required: [],
    },
    handler: async (args) => {
      const parsed = validateArgs(ListEmailTemplatesSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.listEmailTemplates({
          first: parsed.data.limit,
          offset: parsed.data.offset,
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
