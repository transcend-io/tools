import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { UpsertRecordSchema } from './preference-schemas.js';

export const UpsertPreferencesSchema = z.object({
  records: z.array(UpsertRecordSchema).min(1).describe('Preference records to upsert'),
  skipWorkflowTriggers: z
    .boolean()
    .optional()
    .describe('When true, skip workflow triggers for these updates'),
});
export type UpsertPreferencesInput = z.infer<typeof UpsertPreferencesSchema>;

export function createPreferencesUpsertTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'preferences_upsert',
    description: 'Batch upsert consent preference records for multiple users',
    category: 'Preference Management',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    requireSombra: true,
    zodSchema: UpsertPreferencesSchema,
    handler: async ({ records, skipWorkflowTriggers }) => {
      const result = await rest.upsertPreferences({
        records,
        skipWorkflowTriggers,
      });

      return createToolResult(true, {
        ...result,
        recordsProcessed: records.length,
        message: `Successfully upserted ${records.length} preference record(s)`,
      });
    },
  });
}
