import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

const GetPreferencesSchema = z.object({
  identifier: z.string().describe('User identifier (e.g., email, user ID)'),
  partition: z.string().optional().describe('Partition/organization context (optional)'),
});

export function createConsentGetPreferencesTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'consent_get_preferences',
    description: 'Get consent preferences for a specific user/identifier',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetPreferencesSchema,
    handler: async ({ identifier, partition }) => {
      const result = await rest.getConsentPreferences(identifier, partition);
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
    },
  });
}
