import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

const IdentifierSchema = z.object({
  value: z.string().describe('Identifier value'),
  type: z.string().optional().describe('Identifier type (optional)'),
});
const AppendIdentifiersSchema = z.object({
  partition: z.string().describe('Partition/organization context'),
  user_id: z.string().describe('User ID to append identifiers to'),
  identifiers: z.array(IdentifierSchema).describe('Array of identifier objects to append'),
});

export function createPreferencesAppendIdentifiersTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'preferences_append_identifiers',
    description: 'Append additional identifiers to an existing user preference record',
    category: 'Preference Management',
    readOnly: false,
    confirmationHint: 'Appends identifiers to the user preference record',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: AppendIdentifiersSchema,
    handler: async (args) => {
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
  });
}
