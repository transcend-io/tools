import {
  createToolResult,
  z,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

const IdentifierSchema = z.object({ value: z.string(), type: z.string().optional() });
const DeletePreferencesSchema = z.object({
  partition: z.string(),
  identifiers: z.array(IdentifierSchema),
});

export function createPreferencesDeleteTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'preferences_delete',
    description: 'Delete consent preferences for specified users',
    category: 'Preference Management',
    readOnly: false,
    confirmationHint: 'Deletes preference data for the identifiers',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: DeletePreferencesSchema,
    handler: async (rawArgs) => {
      const args = rawArgs as z.infer<typeof DeletePreferencesSchema>;
      try {
        const identifiers = args.identifiers.map((id) => ({
          value: id.value,
          type: id.type,
        }));

        const result = await rest.deletePreferences(args.partition, identifiers);

        return createToolResult(true, {
          ...result,
          message: `Successfully deleted ${result.count} preference records`,
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
