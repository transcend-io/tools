import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { GetPreferencesSchema } from '../schemas.js';

export function createConsentGetPreferencesTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'consent_get_preferences',
    description: 'Get consent preferences for a specific user/identifier',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        identifier: {
          type: 'string',
          description: 'User identifier (e.g., email, user ID)',
        },
        partition: {
          type: 'string',
          description: 'Partition/organization context (optional)',
        },
      },
      required: ['identifier'],
    },
    handler: async (args) => {
      const parsed = validateArgs(GetPreferencesSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await rest.getConsentPreferences(
          parsed.data.identifier,
          parsed.data.partition,
        );
        if (!result) {
          return createToolResult(true, {
            found: false,
            message: 'No consent preferences found for this identifier',
          });
        }
        return createToolResult(true, {
          found: true,
          preferences: result,
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
