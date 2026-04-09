import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-core';

import type { DSRMixin } from '../graphql.js';

const cancelDsrSchema = z.object({
  request_id: z.string(),
  reason: z.string().optional(),
});

export function createDsrCancelTool(clients: ToolClients) {
  const graphql = clients.graphql as DSRMixin;

  return defineTool({
    name: 'dsr_cancel',
    description: 'Cancel a Data Subject Request',
    category: 'DSR Automation',
    readOnly: false,
    confirmationHint: 'Cancels the specified request permanently',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: cancelDsrSchema,
    handler: async ({ request_id, reason }) => {
      try {
        const input: { requestId: string; template?: string; subject?: string } = {
          requestId: request_id,
        };
        if (reason) {
          input.subject = reason;
        }
        const result = await graphql.cancelRequest(input);
        return createToolResult(true, {
          request: result.request,
          message: 'DSR canceled successfully',
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
