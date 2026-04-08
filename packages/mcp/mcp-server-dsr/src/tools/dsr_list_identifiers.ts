import {
  createListResult,
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { ListIdentifiersSchema } from '../schemas.js';

export function createDsrListIdentifiersTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;

  return {
    name: 'dsr_list_identifiers',
    description: 'List all identifiers attached to a Data Subject Request',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        request_id: {
          type: 'string',
          description: 'ID of the DSR',
        },
        limit: {
          type: 'number',
          description: 'Results per page (1-100, default: 50)',
        },
        cursor: {
          type: 'string',
          description: 'Pagination cursor from previous response (not supported by REST API)',
        },
      },
      required: ['request_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(ListIdentifiersSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const identifiers = await rest.listRequestIdentifiers(parsed.data.request_id);
        return createListResult(identifiers);
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
