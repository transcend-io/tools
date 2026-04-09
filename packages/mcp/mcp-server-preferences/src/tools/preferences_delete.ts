import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { DeletePreferencesSchema } from '../schemas.js';

export function createPreferencesDeleteTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'preferences_delete',
    description: 'Delete consent preferences for specified users',
    category: 'Preference Management',
    readOnly: false,
    confirmationHint: 'Deletes preference data for the identifiers',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        partition: {
          type: 'string',
          description: 'Partition/organization context',
        },
        identifiers: {
          type: 'array',
          description: 'Array of identifier objects to delete',
          items: {
            type: 'object',
          },
        },
      },
      required: ['partition', 'identifiers'],
    },
    handler: async (args) => {
      const parsed = validateArgs(DeletePreferencesSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const identifiers = parsed.data.identifiers.map((id) => ({
          value: id.value,
          type: id.type,
        }));

        const result = await rest.deletePreferences(parsed.data.partition, identifiers);

        return createToolResult(true, {
          ...result,
          message: `Successfully deleted ${result.count} preference records`,
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
