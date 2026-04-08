import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { RespondAccessSchema } from '../schemas.js';

export function createDsrRespondAccessTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;

  return {
    name: 'dsr_respond_access',
    description: 'Respond to an ACCESS request by uploading user data',
    category: 'DSR Automation',
    readOnly: false,
    confirmationHint: 'Uploads access response data for the DSR',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        request_id: {
          type: 'string',
          description: 'ID of the DSR',
        },
        data_silo_id: {
          type: 'string',
          description: 'ID of the data silo responding',
        },
        profiles: {
          type: 'array',
          description: 'Array of profile data objects to return',
          items: { type: 'object' },
        },
      },
      required: ['request_id', 'data_silo_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(RespondAccessSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await rest.respondToAccess({
          requestId: parsed.data.request_id,
          dataSiloId: parsed.data.data_silo_id,
          profiles: parsed.data.profiles as Record<string, unknown>[] | undefined,
        });
        return createToolResult(true, {
          ...result,
          message: 'Access response submitted successfully',
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
