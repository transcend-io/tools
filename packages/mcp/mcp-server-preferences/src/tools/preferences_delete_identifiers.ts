import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { DeleteIdentifierRecordSchema } from './preference-schemas.js';

export const DeleteIdentifiersSchema = z.object({
  partition: z.string().describe('Preference store partition key'),
  records: z
    .array(DeleteIdentifierRecordSchema)
    .min(1)
    .describe('Identifier delete operations to perform'),
});
export type DeleteIdentifiersInput = z.infer<typeof DeleteIdentifiersSchema>;

export function createPreferencesDeleteIdentifiersTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'preferences_delete_identifiers',
    description: 'Delete specific identifiers from user preference records',
    category: 'Preference Management',
    readOnly: false,
    confirmation: {
      hint:
        "Permanently removes these identifiers from a user's preference record. Consent " +
        'recorded against a removed identifier can no longer be looked up by it. Check the ' +
        'identifiers in the call arguments before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    requireSombra: true,
    zodSchema: DeleteIdentifiersSchema,
    handler: async ({ partition, records }) => {
      const result = await rest.deleteIdentifiers(partition, records);

      return createToolResult(true, {
        ...result,
        recordsProcessed: records.length,
        message: 'Identifiers deleted successfully',
      });
    },
  });
}
