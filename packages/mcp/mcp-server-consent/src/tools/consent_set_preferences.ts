import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { SetPreferencesSchema } from '../schemas.js';

export function createConsentSetPreferencesTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'consent_set_preferences',
    description: 'Set consent preferences for a user (client-side sync)',
    category: 'Consent Management',
    readOnly: false,
    confirmationHint: 'Updates consent preferences for the user',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        identifier: {
          type: 'string',
          description: 'User identifier',
        },
        partition: {
          type: 'string',
          description: 'Partition/organization context',
        },
        purposes: {
          type: 'array',
          description: 'Array of purpose consent settings',
          items: {
            type: 'object',
          },
        },
        confirmed: {
          type: 'boolean',
          description: 'Whether consent was explicitly confirmed',
        },
      },
      required: ['partition', 'purposes'],
    },
    handler: async (args) => {
      const parsed = validateArgs(SetPreferencesSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await rest.syncConsent({
          partition: parsed.data.partition,
          identifier: parsed.data.identifier,
          purposes: parsed.data.purposes.map((p) => ({
            purpose: p.purpose,
            enabled: p.enabled,
          })),
          confirmed: parsed.data.confirmed,
        });
        return createToolResult(true, {
          ...result,
          message: 'Consent preferences synced successfully',
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
