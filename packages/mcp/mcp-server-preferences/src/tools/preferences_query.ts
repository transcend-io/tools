import {
  createListResult,
  createToolResult,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

const IdentifierSchema = z.object({
  value: z.string().describe('Identifier value'),
  type: z.string().optional().describe('Identifier type (optional)'),
});
const QueryPreferencesSchema = z.object({
  partition: z.string().describe('Partition/organization context'),
  identifiers: z.array(IdentifierSchema).describe('Array of identifier objects to query'),
});

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
      try {
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
