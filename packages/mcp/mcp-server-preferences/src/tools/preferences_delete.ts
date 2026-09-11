import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import {
  isPreferenceMutationSuccessful,
  preferenceMutationFailureCount,
  preferenceMutationToolResult,
} from './mutation-success.js';
import { DeleteRecordSchema, PARTITION_DESCRIBE } from './preference-schemas.js';

export const DeletePreferencesSchema = z.object({
  partition: z.string().describe(PARTITION_DESCRIBE),
  records: z.array(DeleteRecordSchema).min(1).describe('Preference records to delete'),
});
export type DeletePreferencesInput = z.infer<typeof DeletePreferencesSchema>;

export function createPreferencesDeleteTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'preferences_delete',
    description: 'Delete consent preferences for specified users',
    category: 'Preference Management',
    readOnly: false,
    confirmation: {
      hint:
        'Permanently deletes stored consent preferences for these identifiers. The previous ' +
        'consent state cannot be recovered, and the people affected fall back to default ' +
        'consent. Check the identifiers in the call arguments before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    requireSombra: true,
    zodSchema: DeletePreferencesSchema,
    handler: async ({ partition, records }) => {
      const result = await rest.deletePreferences(partition, records);

      const ok = isPreferenceMutationSuccessful(result);
      const failureCount = preferenceMutationFailureCount(result);
      return preferenceMutationToolResult(
        createToolResult,
        ok,
        {
          ...result,
          recordsProcessed: records.length,
          message: ok
            ? `Processed deletion for ${records.length} preference record(s)`
            : `Preference delete completed with ${failureCount} failure(s)`,
        },
        `Preference delete failed for ${failureCount} record(s)`,
      );
    },
  });
}
