import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { WorkflowsMixin } from '../graphql.js';

export const ListEmailTemplatesSchema = OffsetPaginationSchema;
export type ListEmailTemplatesInput = z.infer<typeof ListEmailTemplatesSchema>;

export function createWorkflowsListEmailTemplatesTool(clients: ToolClients) {
  const graphql = clients.graphql as WorkflowsMixin;
  return defineTool({
    name: 'workflows_list_email_templates',
    description: 'List all email templates used in workflows and communications.',
    category: 'Workflows',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListEmailTemplatesSchema,
    handler: async ({ limit, offset }) => {
      const result = await graphql.listEmailTemplates({
        first: limit,
        offset,
      });

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}
