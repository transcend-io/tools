import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

export const UpsertPreferencesPurposeSchema = z.object({
  purpose: z.string().describe('Purpose slug'),
  enabled: z.boolean().describe('Whether consent is granted'),
});
export type UpsertPreferencesPurposeInput = z.infer<typeof UpsertPreferencesPurposeSchema>;

export const UpsertPreferencesRecordSchema = z.object({
  identifier: z.string().describe('User identifier'),
  identifierType: z.string().optional().describe('Identifier type (optional)'),
  purposes: z.array(UpsertPreferencesPurposeSchema).describe('Array of purpose consent settings'),
  confirmed: z.boolean().optional().describe('Whether consent was explicitly confirmed'),
});
export type UpsertPreferencesRecordInput = z.infer<typeof UpsertPreferencesRecordSchema>;

export const UpsertPreferencesSchema = z.object({
  partition: z.string().describe('Partition/organization context'),
  records: z.array(UpsertPreferencesRecordSchema).describe('Array of preference records to upsert'),
});
export type UpsertPreferencesInput = z.infer<typeof UpsertPreferencesSchema>;

export function createPreferencesUpsertTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'preferences_upsert',
    description: 'Batch upsert consent preference records for multiple users',
    category: 'Preference Management',
    readOnly: false,
    confirmationHint: 'Creates or updates preference records for users',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: UpsertPreferencesSchema,
    handler: async ({ partition, records }) => {
      const result = await rest.upsertPreferences({
        partition,
        records: records.map((record) => ({
          identifier: record.identifier,
          identifierType: record.identifierType,
          purposes: record.purposes.map((p) => ({
            purpose: p.purpose,
            enabled: p.enabled,
          })),
          confirmed: record.confirmed,
        })),
      });

      return createToolResult(true, {
        ...result,
        recordsProcessed: records.length,
        message: `Successfully upserted ${result.count} preference records`,
      });
    },
  });
}
