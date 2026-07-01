import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-base';

import type { DSRMixin } from '../graphql.js';

export const cancelDsrSchema = z.object({
  requestId: z.string().describe('ID of the DSR to cancel'),
  reason: z.string().optional().describe('Reason for cancellation (optional)'),
});
export type CancelDsrInput = z.infer<typeof cancelDsrSchema>;

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
    handler: async ({ requestId, reason }) => {
      const input: { requestId: string; template?: string; subject?: string } = {
        requestId,
      };
      if (reason) {
        input.subject = reason;
      }
      const result = await graphql.cancelRequest(input);
      return createToolResult(true, {
        request: result.request,
        message: 'DSR canceled successfully',
      });
    },
  });
}
