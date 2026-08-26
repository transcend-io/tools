import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { DeleteRecordSchema } from './preference-schemas.js';

export const DeletePreferencesSchema = z.object({
  partition: z.string().describe('Preference store partition key'),
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

      return createToolResult(true, {
        ...result,
        recordsProcessed: records.length,
        message: `Processed deletion for ${records.length} preference record(s)`,
      });
    },
  });
}
