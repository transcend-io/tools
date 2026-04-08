import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { DSRMixin } from '../graphql.js';
import { CancelDSRSchema } from '../schemas.js';

export function createDsrCancelTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as DSRMixin;

  return {
    name: 'dsr_cancel',
    description: 'Cancel a Data Subject Request',
    category: 'DSR Automation',
    readOnly: false,
    confirmationHint: 'Cancels the specified request permanently',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        request_id: {
          type: 'string',
          description: 'ID of the DSR to cancel',
        },
        reason: {
          type: 'string',
          description: 'Reason for cancellation (optional)',
        },
      },
      required: ['request_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(CancelDSRSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const input: { requestId: string; template?: string; subject?: string } = {
          requestId: parsed.data.request_id,
        };
        if (parsed.data.reason) {
          input.subject = parsed.data.reason;
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
