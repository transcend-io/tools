import {
  createToolResult,
  z,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

const GetPreferencesSchema = z.object({
  identifier: z.string().describe('User identifier (e.g., email, user ID)'),
  partition: z.string().optional().describe('Partition/organization context (optional)'),
});

export function createConsentGetPreferencesTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'consent_get_preferences',
    description: 'Get consent preferences for a specific user/identifier',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetPreferencesSchema,
    handler: async (args) => {
      const { identifier, partition } = args as z.infer<typeof GetPreferencesSchema>;
      try {
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
