import {
  createListResult,
  createToolResult,
  defineTool,
  PaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { WorkflowsMixin } from '../graphql.js';

const ListEmailTemplatesSchema = PaginationSchema.extend({
  offset: z.coerce.number().min(0).optional().default(0),
});

export function createWorkflowsListEmailTemplatesTool(clients: ToolClients) {
  const graphql = clients.graphql as WorkflowsMixin;
  return defineTool({
    name: 'workflows_list_email_templates',
    description:
      'List all email templates used in workflows and communications. Note: API does not support cursor pagination (max ~100 results).',
    category: 'Workflows',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListEmailTemplatesSchema,
    handler: async ({ limit, offset }) => {
      try {
        const result = await graphql.listEmailTemplates({
          first: limit,
          offset,
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
