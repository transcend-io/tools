import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

const UpdateIdentifiersSchema = z.object({
  partition: z.string().describe('Partition/organization context'),
  user_id: z.string().describe('User ID to update identifiers for'),
  identifiers: z
    .array(
      z.object({
        oldValue: z.string().describe('Old identifier value'),
        newValue: z.string().describe('New identifier value'),
        type: z.string().optional().describe('Identifier type (optional)'),
      }),
    )
    .describe('Array of identifier update objects with old and new values'),
});

export function createPreferencesUpdateIdentifiersTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'preferences_update_identifiers',
    description: 'Update existing identifiers for a user (e.g., when email changes)',
    category: 'Preference Management',
    readOnly: false,
    confirmationHint: 'Updates identifiers for the user preference record',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: UpdateIdentifiersSchema,
    handler: async ({ partition, user_id, identifiers }) => {
      const result = await rest.updateIdentifiers(
        partition,
        user_id,
        identifiers.map((id) => ({
          oldValue: id.oldValue,
          newValue: id.newValue,
          type: id.type,
        })),
      );

      return createToolResult(true, {
        ...result,
        identifiersUpdated: identifiers.length,
        message: 'Identifiers updated successfully',
      });
    },
  });
}
