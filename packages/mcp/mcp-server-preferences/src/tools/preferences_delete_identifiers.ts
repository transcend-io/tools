import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { DeleteIdentifiersSchema } from '../schemas.js';

export function createPreferencesDeleteIdentifiersTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'preferences_delete_identifiers',
    description: 'Delete specific identifiers from a user preference record',
    category: 'Preference Management',
    readOnly: false,
    confirmationHint: 'Deletes identifiers from the user preference record',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        partition: {
          type: 'string',
          description: 'Partition/organization context',
        },
        user_id: {
          type: 'string',
          description: 'User ID to delete identifiers from',
        },
        identifiers: {
          type: 'array',
          description: 'Array of identifier objects to delete',
          items: {
            type: 'object',
          },
        },
      },
      required: ['partition', 'user_id', 'identifiers'],
    },
    handler: async (args) => {
      const parsed = validateArgs(DeleteIdentifiersSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const identifiers = parsed.data.identifiers.map((id) => ({
          value: id.value,
          type: id.type,
        }));

        const result = await rest.deleteIdentifiers(
          parsed.data.partition,
          parsed.data.user_id,
          identifiers,
        );

        return createToolResult(true, {
          ...result,
          identifiersDeleted: identifiers.length,
          message: 'Identifiers deleted successfully',
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
