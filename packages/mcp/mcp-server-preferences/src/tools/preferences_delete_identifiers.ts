import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import {
  isPreferenceMutationSuccessful,
  preferenceMutationFailureCount,
  preferenceMutationToolResult,
} from './mutation-success.js';
import { DeleteIdentifierRecordSchema, PARTITION_DESCRIBE } from './preference-schemas.js';

export const DeleteIdentifiersSchema = z.object({
  partition: z.string().describe(PARTITION_DESCRIBE),
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
    description:
      'Remove one identifier from a preference record, keeping the record and its remaining ' +
      'identifiers. Use preferences_delete to remove the whole record.',
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

      const ok = isPreferenceMutationSuccessful(result);
      const failureCount = preferenceMutationFailureCount(result);
      return preferenceMutationToolResult(
        createToolResult,
        ok,
        {
          ...result,
          recordsProcessed: records.length,
          message: ok
            ? 'Identifiers deleted successfully'
            : `Identifier delete completed with ${failureCount} failure(s)`,
        },
        `Identifier delete failed for ${failureCount} record(s)`,
      );
    },
  });
}
