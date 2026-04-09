import {
  createToolResult,
  z,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

const IdentifierSchema = z.object({ value: z.string(), type: z.string().optional() });
const AppendIdentifiersSchema = z.object({
  partition: z.string(),
  user_id: z.string(),
  identifiers: z.array(IdentifierSchema),
});

export function createPreferencesAppendIdentifiersTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'preferences_append_identifiers',
    description: 'Append additional identifiers to an existing user preference record',
    category: 'Preference Management',
    readOnly: false,
    confirmationHint: 'Appends identifiers to the user preference record',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: AppendIdentifiersSchema,
    handler: async (rawArgs) => {
      const args = rawArgs as z.infer<typeof AppendIdentifiersSchema>;
      try {
        const identifiers = args.identifiers.map((id) => ({
          value: id.value,
          type: id.type,
        }));

        const result = await rest.appendIdentifiers(args.partition, args.user_id, identifiers);

        return createToolResult(true, {
          ...result,
          identifiersAdded: identifiers.length,
          message: 'Identifiers appended successfully',
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
