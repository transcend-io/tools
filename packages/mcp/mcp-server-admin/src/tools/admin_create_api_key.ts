import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { AdminMixin } from '../graphql.js';

const CreateApiKeySchema = z.object({
  title: z.string().describe('Name/title for the API key'),
  scopes: z.array(z.string()).describe('Array of permission scopes for the key (ScopeName values)'),
  data_silos: z
    .array(z.string())
    .optional()
    .describe('Array of data silo IDs to assign the key to (optional)'),
});

export function createAdminCreateApiKeyTool(clients: ToolClients) {
  const graphql = clients.graphql as AdminMixin;
  return defineTool({
    name: 'admin_create_api_key',
    description:
      'Create a new API key with specified scopes. WARNING: The token is only shown once!',
    category: 'Admin',
    readOnly: false,
    confirmationHint: 'Creates a new API key with the specified scopes',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: CreateApiKeySchema,
    handler: async ({ title, scopes, data_silos }) => {
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
    },
  });
}
