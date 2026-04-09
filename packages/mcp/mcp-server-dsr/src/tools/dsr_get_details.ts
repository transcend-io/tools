import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { DSRMixin } from '../graphql.js';
import { GetDetailsSchema } from '../schemas.js';

export function createDsrGetDetailsTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as DSRMixin;

  return {
    name: 'dsr_get_details',
    description: 'Get detailed information about a specific Data Subject Request',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        request_id: {
          type: 'string',
          description: 'ID of the DSR to retrieve',
        },
      },
      required: ['request_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(GetDetailsSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.getRequest(parsed.data.request_id);
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
