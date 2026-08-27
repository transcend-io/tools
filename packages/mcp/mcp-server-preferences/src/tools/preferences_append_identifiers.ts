import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { IdentifierSchema } from './preferences_query.js';

export const AppendIdentifiersSchema = z.object({
  partition: z.string().describe('Partition/organization context'),
  userId: z.string().describe('User ID to append identifiers to'),
  identifiers: z.array(IdentifierSchema).describe('Array of identifier objects to append'),
});
export type AppendIdentifiersInput = z.infer<typeof AppendIdentifiersSchema>;

export function createPreferencesAppendIdentifiersTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'preferences_append_identifiers',
    description: 'Append additional identifiers to an existing user preference record',
    category: 'Preference Management',
    readOnly: false,
    confirmation: {
      hint:
        'Links additional identifiers to an existing preference record, widening how that ' +
        "user's consent can be looked up. Check userId and identifiers in the call " +
        'arguments before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    requireSombra: true,
    zodSchema: AppendIdentifiersSchema,
    handler: async ({ partition, userId, identifiers }) => {
      const result = await rest.appendIdentifiers(
        partition,
        userId,
        identifiers.map((id) => ({
          value: id.value,
          type: id.type,
        })),
      );

      return createToolResult(true, {
        ...result,
        identifiersAdded: identifiers.length,
        message: 'Identifiers appended successfully',
      });
    },
  });
}
