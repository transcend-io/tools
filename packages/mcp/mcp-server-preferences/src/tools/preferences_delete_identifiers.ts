import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { IdentifierSchema } from './preferences_query.js';

export const DeleteIdentifiersSchema = z.object({
  partition: z.string().describe('Partition/organization context'),
  user_id: z.string().describe('User ID to delete identifiers from'),
  identifiers: z.array(IdentifierSchema).describe('Array of identifier objects to delete'),
});
export type DeleteIdentifiersInput = z.infer<typeof DeleteIdentifiersSchema>;

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
    handler: async ({ partition, user_id, identifiers }) => {
      const result = await rest.deleteIdentifiers(
        partition,
        user_id,
        identifiers.map((id) => ({
          value: id.value,
          type: id.type,
        })),
      );

      return createToolResult(true, {
        ...result,
        identifiersDeleted: identifiers.length,
        message: 'Identifiers deleted successfully',
      });
    },
  });
}
