import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

export const IdentifierSchema = z.object({
  value: z.string().describe('Identifier value'),
  type: z.string().optional().describe('Identifier type (optional)'),
});
export type IdentifierInput = z.infer<typeof IdentifierSchema>;

export const QueryPreferencesSchema = z.object({
  partition: z.string().describe('Partition/organization context'),
  identifiers: z.array(IdentifierSchema).describe('Array of identifier objects to query'),
});
export type QueryPreferencesInput = z.infer<typeof QueryPreferencesSchema>;

export function createPreferencesQueryTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'preferences_query',
    description: 'Query consent preferences for multiple users by their identifiers',
    category: 'Preference Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: QueryPreferencesSchema,
    handler: async ({ partition, identifiers }) => {
      const result = await rest.queryPreferences({
        partition,
        identifiers: identifiers.map((id) => ({
          value: id.value,
          type: id.type,
        })),
      });

      return createListResult(result, {
        totalCount: result.length,
      });
    },
  });
}
