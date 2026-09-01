import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import {
  isPreferenceMutationSuccessful,
  preferenceMutationFailureCount,
  preferenceMutationToolResult,
} from './mutation-success.js';
import { AppendRecordSchema, PARTITION_DESCRIBE } from './preference-schemas.js';

export const AppendIdentifiersSchema = z.object({
  partition: z.string().describe(PARTITION_DESCRIBE),
  records: z.array(AppendRecordSchema).min(1).describe('Identifier append operations to perform'),
});
export type AppendIdentifiersInput = z.infer<typeof AppendIdentifiersSchema>;

export function createPreferencesAppendIdentifiersTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'preferences_append_identifiers',
    description:
      'Add another identifier that resolves to an existing preference record. ' +
      'Leaves current identifiers and their consent history intact.',
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

      const ok = isPreferenceMutationSuccessful(result);
      const failureCount = preferenceMutationFailureCount(result);
      return preferenceMutationToolResult(
        createToolResult,
        ok,
        {
          ...result,
          recordsProcessed: records.length,
          message: ok
            ? 'Identifiers appended successfully'
            : `Identifier append completed with ${failureCount} failure(s)`,
        },
        `Identifier append failed for ${failureCount} record(s)`,
      );
    },
  });
}
