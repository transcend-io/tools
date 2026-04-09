import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

const UpdateIdentifiersSchema = z.object({
  partition: z.string(),
  user_id: z.string(),
  identifiers: z.array(
    z.object({
      oldValue: z.string(),
      newValue: z.string(),
      type: z.string().optional(),
    }),
  ),
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
    handler: async (args) => {
      try {
        const identifiers = args.identifiers.map((id) => ({
          oldValue: id.oldValue,
          newValue: id.newValue,
          type: id.type,
        }));

        const result = await rest.updateIdentifiers(args.partition, args.user_id, identifiers);

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
  });
}
