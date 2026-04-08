import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AdminMixin } from '../graphql.js';
import { CreateApiKeySchema } from '../schemas.js';

export function createAdminCreateApiKeyTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AdminMixin;
  return {
    name: 'admin_create_api_key',
    description:
      'Create a new API key with specified scopes. WARNING: The token is only shown once!',
    category: 'Admin',
    readOnly: false,
    confirmationHint: 'Creates a new API key with the specified scopes',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Name/title for the API key' },
        scopes: {
          type: 'array',
          description: 'Array of permission scopes for the key (ScopeName values)',
          items: { type: 'string' },
        },
        data_silos: {
          type: 'array',
          description: 'Array of data silo IDs to assign the key to (optional)',
          items: { type: 'string' },
        },
      },
      required: ['title', 'scopes'],
    },
    handler: async (args) => {
      const parsed = validateArgs(CreateApiKeySchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.createApiKey({
          title: parsed.data.title,
          scopes: parsed.data.scopes,
          dataSilos: parsed.data.data_silos,
        });
        return createToolResult(true, {
          apiKey: result.apiKey,
          token: result.token,
          warning: 'IMPORTANT: Save this token now! It will not be shown again.',
          message: `API key "${parsed.data.title}" created successfully`,
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
