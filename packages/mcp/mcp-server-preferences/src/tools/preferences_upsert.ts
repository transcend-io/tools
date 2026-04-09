import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

const UpsertPreferencesSchema = z.object({
  partition: z.string(),
  records: z.array(
    z.object({
      identifier: z.string(),
      identifierType: z.string().optional(),
      purposes: z.array(z.object({ purpose: z.string(), enabled: z.boolean() })),
      confirmed: z.boolean().optional(),
    }),
  ),
});

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
    handler: async (args) => {
      try {
        const records = args.records.map((record) => ({
          identifier: record.identifier,
          identifierType: record.identifierType,
          purposes: record.purposes.map((p) => ({
            purpose: p.purpose,
            enabled: p.enabled,
          })),
          confirmed: record.confirmed,
        }));

        const result = await rest.upsertPreferences({
          partition: args.partition,
          records,
        });

        return createToolResult(true, {
          ...result,
          recordsProcessed: records.length,
          message: `Successfully upserted ${result.count} preference records`,
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });
}
