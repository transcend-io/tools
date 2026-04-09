import {
  createToolResult,
  type ToolClients,
  type ToolDefinition,
  z,
} from '@transcend-io/mcp-server-core';

import type { DSRMixin } from '../graphql.js';

const getDetailsSchema = z.object({
  request_id: z.string(),
});

export function createDsrGetDetailsTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as DSRMixin;

  return {
    name: 'dsr_get_details',
    description: 'Get detailed information about a specific Data Subject Request',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: getDetailsSchema,
    handler: async (args) => {
      try {
        const result = await graphql.getRequest(args.request_id);
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
