import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-core';

import type { DSRMixin } from '../graphql.js';

const getDetailsSchema = z.object({
  request_id: z.string().describe('ID of the DSR to retrieve'),
});

export function createDsrGetDetailsTool(clients: ToolClients) {
  const graphql = clients.graphql as DSRMixin;

  return defineTool({
    name: 'dsr_get_details',
    description: 'Get detailed information about a specific Data Subject Request',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: getDetailsSchema,
    handler: async ({ request_id }) => {
      try {
        const result = await graphql.getRequest(request_id);
        return createToolResult(true, result);
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
