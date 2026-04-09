import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { PollStatusSchema } from '../schemas.js';

export function createDsrPollStatusTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;

  return {
    name: 'dsr_poll_status',
    description: 'Poll the current status of a Data Subject Request',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        request_id: {
          type: 'string',
          description: 'ID of the DSR to check',
        },
      },
      required: ['request_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(PollStatusSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await rest.getDSRStatus(parsed.data.request_id);
        return createToolResult(true, result);
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
