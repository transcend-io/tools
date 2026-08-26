import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { AppendRecordSchema } from './preference-schemas.js';

export const AppendIdentifiersSchema = z.object({
  partition: z.string().describe('Preference store partition key'),
  records: z.array(AppendRecordSchema).min(1).describe('Identifier append operations to perform'),
});
export type AppendIdentifiersInput = z.infer<typeof AppendIdentifiersSchema>;

export function createPreferencesAppendIdentifiersTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'preferences_append_identifiers',
    description: 'Append additional identifiers to existing user preference records',
    category: 'Preference Management',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    requireSombra: true,
    zodSchema: AppendIdentifiersSchema,
    handler: async ({ partition, records }) => {
      const result = await rest.appendIdentifiers(partition, records);

      return createToolResult(true, {
        ...result,
        recordsProcessed: records.length,
        message: 'Identifiers appended successfully',
      });
    },
  });
}
