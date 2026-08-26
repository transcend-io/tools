import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { IdentifierSchema } from './preference-schemas.js';

export { IdentifierSchema };
export type { IdentifierInput } from './preference-schemas.js';

export const QueryPreferencesSchema = z.object({
  partition: z.string().describe('Preference store partition key'),
  identifiers: z.array(IdentifierSchema).describe('Identifiers to query'),
  limit: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .describe('Max records to return (1–50, defaults to identifier count)'),
  cursor: z.string().optional().describe('Pagination cursor from a previous query'),
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
    requireSombra: true,
    zodSchema: QueryPreferencesSchema,
    handler: async ({ partition, identifiers, limit, cursor }) => {
      const result = await rest.queryPreferences({
        partition,
        identifiers,
        limit,
        cursor,
      });

      return createListResult(result.nodes, {
        totalCount: result.nodes.length,
        hasNextPage: Boolean(result.cursor),
        cursor: result.cursor,
      });
    },
  });
}
