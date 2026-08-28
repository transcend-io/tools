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
    confirmation: {
      hint:
        'Links additional identifiers to an existing preference record, widening how that ' +
        "user's consent can be looked up. Check userId and identifiers in the call " +
        'arguments before agreeing.',
    },
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
