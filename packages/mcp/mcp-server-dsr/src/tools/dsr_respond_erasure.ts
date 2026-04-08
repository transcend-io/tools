import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { RespondErasureSchema } from '../schemas.js';

export function createDsrRespondErasureTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;

  return {
    name: 'dsr_respond_erasure',
    description: 'Confirm that data erasure has been completed for a data silo',
    category: 'DSR Automation',
    readOnly: false,
    confirmationHint: 'Confirms erasure completion for the data silo',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        request_id: {
          type: 'string',
          description: 'ID of the DSR',
        },
        data_silo_id: {
          type: 'string',
          description: 'ID of the data silo that completed erasure',
        },
        profile_ids: {
          type: 'array',
          description: 'IDs of profiles that were erased (optional)',
          items: { type: 'string' },
        },
      },
      required: ['request_id', 'data_silo_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(RespondErasureSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await rest.confirmErasure({
          requestId: parsed.data.request_id,
          dataSiloId: parsed.data.data_silo_id,
          profileIds: parsed.data.profile_ids,
        });
        return createToolResult(true, {
          ...result,
          message: 'Erasure confirmation submitted successfully',
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
