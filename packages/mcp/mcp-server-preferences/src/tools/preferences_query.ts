import {
  createListResult,
  createToolResult,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

const IdentifierSchema = z.object({ value: z.string(), type: z.string().optional() });
const QueryPreferencesSchema = z.object({
  partition: z.string(),
  identifiers: z.array(IdentifierSchema),
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
    handler: async (args) => {
      try {
        const identifiers = args.identifiers.map((id) => ({
          value: id.value,
          type: id.type,
        }));

        const result = await rest.queryPreferences({
          partition: args.partition,
          identifiers,
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
