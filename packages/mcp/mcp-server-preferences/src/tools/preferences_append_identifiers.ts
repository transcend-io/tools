import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { AppendIdentifiersSchema } from '../schemas.js';

export function createPreferencesAppendIdentifiersTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'preferences_append_identifiers',
    description: 'Append additional identifiers to an existing user preference record',
    category: 'Preference Management',
    readOnly: false,
    confirmationHint: 'Appends identifiers to the user preference record',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        partition: {
          type: 'string',
          description: 'Partition/organization context',
        },
        user_id: {
          type: 'string',
          description: 'User ID to append identifiers to',
        },
        identifiers: {
          type: 'array',
          description: 'Array of identifier objects to append',
          items: {
            type: 'object',
          },
        },
      },
      required: ['partition', 'user_id', 'identifiers'],
    },
    handler: async (args) => {
      const parsed = validateArgs(AppendIdentifiersSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const identifiers = parsed.data.identifiers.map((id) => ({
          value: id.value,
          type: id.type,
        }));

        const result = await rest.appendIdentifiers(
          parsed.data.partition,
          parsed.data.user_id,
          identifiers,
        );

        return createToolResult(true, {
          ...result,
          identifiersAdded: identifiers.length,
          message: 'Identifiers appended successfully',
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
