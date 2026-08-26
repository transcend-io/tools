import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { UpdateRecordSchema } from './preference-schemas.js';

export const UpdateIdentifiersSchema = z.object({
  partition: z.string().describe('Preference store partition key'),
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

      return createToolResult(true, {
        ...result,
        recordsProcessed: records.length,
        message: 'Identifiers updated successfully',
      });
    },
  });
}
