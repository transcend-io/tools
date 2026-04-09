import {
  createToolResult,
  z,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AdminMixin } from '../graphql.js';

const CreateApiKeySchema = z.object({
  title: z.string(),
  scopes: z.array(z.string()),
  data_silos: z.array(z.string()).optional(),
});

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
    zodSchema: CreateApiKeySchema,
    handler: async (args) => {
      const { title, scopes, data_silos } = args as z.infer<typeof CreateApiKeySchema>;
      try {
        const result = await graphql.createApiKey({
          title,
          scopes,
          dataSilos: data_silos,
        });
        return createToolResult(true, {
          apiKey: result.apiKey,
          token: result.token,
          warning: 'IMPORTANT: Save this token now! It will not be shown again.',
          message: `API key "${title}" created successfully`,
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
