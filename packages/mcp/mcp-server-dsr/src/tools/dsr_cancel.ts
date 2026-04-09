import {
  createToolResult,
  type ToolClients,
  type ToolDefinition,
  z,
} from '@transcend-io/mcp-server-core';

import type { DSRMixin } from '../graphql.js';

const cancelDsrSchema = z.object({
  request_id: z.string(),
  reason: z.string().optional(),
});

export function createDsrCancelTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as DSRMixin;

  return {
    name: 'dsr_cancel',
    description: 'Cancel a Data Subject Request',
    category: 'DSR Automation',
    readOnly: false,
    confirmationHint: 'Cancels the specified request permanently',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: cancelDsrSchema,
    handler: async (args) => {
      try {
        const input: { requestId: string; template?: string; subject?: string } = {
          requestId: args.request_id,
        };
        if (args.reason) {
          input.subject = args.reason;
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
  };
}
