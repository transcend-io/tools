import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { UpdateIdentifiersSchema } from '../schemas.js';

export function createPreferencesUpdateIdentifiersTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'preferences_update_identifiers',
    description: 'Update existing identifiers for a user (e.g., when email changes)',
    category: 'Preference Management',
    readOnly: false,
    confirmationHint: 'Updates identifiers for the user preference record',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        partition: {
          type: 'string',
          description: 'Partition/organization context',
        },
        user_id: {
          type: 'string',
          description: 'User ID to update identifiers for',
        },
        identifiers: {
          type: 'array',
          description: 'Array of identifier update objects with old and new values',
          items: {
            type: 'object',
          },
        },
      },
      required: ['partition', 'user_id', 'identifiers'],
    },
    handler: async (args) => {
      const parsed = validateArgs(UpdateIdentifiersSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const identifiers = parsed.data.identifiers.map((id) => ({
          oldValue: id.oldValue,
          newValue: id.newValue,
          type: id.type,
        }));

        const result = await rest.updateIdentifiers(
          parsed.data.partition,
          parsed.data.user_id,
          identifiers,
        );

        return createToolResult(true, {
          ...result,
          identifiersUpdated: identifiers.length,
          message: 'Identifiers updated successfully',
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
