import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

const IdentifierSchema = z.object({
  value: z.string().describe('Identifier value'),
  type: z.string().optional().describe('Identifier type (optional)'),
});
const DeleteIdentifiersSchema = z.object({
  partition: z.string().describe('Partition/organization context'),
  user_id: z.string().describe('User ID to delete identifiers from'),
  identifiers: z.array(IdentifierSchema).describe('Array of identifier objects to delete'),
});

export function createPreferencesDeleteIdentifiersTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'preferences_delete_identifiers',
    description: 'Delete specific identifiers from a user preference record',
    category: 'Preference Management',
    readOnly: false,
    confirmationHint: 'Deletes identifiers from the user preference record',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: DeleteIdentifiersSchema,
    handler: async (args) => {
      try {
        const identifiers = args.identifiers.map((id) => ({
          value: id.value,
          type: id.type,
        }));

        const result = await rest.deleteIdentifiers(args.partition, args.user_id, identifiers);

        return createToolResult(true, {
          ...result,
          identifiersDeleted: identifiers.length,
          message: 'Identifiers deleted successfully',
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
