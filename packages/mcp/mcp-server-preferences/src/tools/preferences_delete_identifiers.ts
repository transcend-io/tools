import {
  createToolResult,
  z,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

const IdentifierSchema = z.object({ value: z.string(), type: z.string().optional() });
const DeleteIdentifiersSchema = z.object({
  partition: z.string(),
  user_id: z.string(),
  identifiers: z.array(IdentifierSchema),
});

export function createPreferencesDeleteIdentifiersTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'preferences_delete_identifiers',
    description: 'Delete specific identifiers from a user preference record',
    category: 'Preference Management',
    readOnly: false,
    confirmationHint: 'Deletes identifiers from the user preference record',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: DeleteIdentifiersSchema,
    handler: async (rawArgs) => {
      const args = rawArgs as z.infer<typeof DeleteIdentifiersSchema>;
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
  };
}
