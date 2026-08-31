import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import {
  isPreferenceMutationSuccessful,
  preferenceMutationFailureCount,
  preferenceMutationToolResult,
} from './mutation-success.js';
import { UpdateRecordSchema, PARTITION_DESCRIBE } from './preference-schemas.js';

export const UpdateIdentifiersSchema = z.object({
  partition: z.string().describe(PARTITION_DESCRIBE),
  records: z.array(UpdateRecordSchema).min(1).describe('Identifier update operations to perform'),
});
export type UpdateIdentifiersInput = z.infer<typeof UpdateIdentifiersSchema>;

export function createPreferencesUpdateIdentifiersTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'preferences_update_identifiers',
    description: 'Update existing identifiers for a user (e.g., when email changes)',
    category: 'Preference Management',
    readOnly: false,
    confirmation: {
      hint:
        'Rewrites identifier values in the preference store, moving the consent history ' +
        'attached to each old value onto the new one. The old values stop resolving. Check the ' +
        'old and new values in the call arguments before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    requireSombra: true,
    zodSchema: UpdateIdentifiersSchema,
    handler: async ({ partition, records }) => {
      const result = await rest.updateIdentifiers(partition, records);

      const ok = isPreferenceMutationSuccessful(result);
      const failureCount = preferenceMutationFailureCount(result);
      return preferenceMutationToolResult(
        createToolResult,
        ok,
        {
          ...result,
          recordsProcessed: records.length,
          message: ok
            ? 'Identifiers updated successfully'
            : `Identifier update completed with ${failureCount} failure(s)`,
        },
        `Identifier update failed for ${failureCount} record(s)`,
      );
    },
  });
}
