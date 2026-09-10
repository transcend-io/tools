import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { IdentifierSchema, PARTITION_DESCRIBE } from './preference-schemas.js';

export { IdentifierSchema };
export type { IdentifierInput } from './preference-schemas.js';

export const QueryPreferencesSchema = z.object({
  partition: z.string().describe(PARTITION_DESCRIBE),
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

/**
 * Preference Store sometimes returns a non-null cursor that base64-decodes to a
 * payload containing decryptionStatus ERROR even when there is no further page.
 * Treat those as terminal so agents do not keep paging.
 */
export function isTerminalPreferenceQueryCursor(cursor: string): boolean {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    return (
      decoded.includes('"decryptionStatus":"ERROR"') ||
      decoded.includes('"decryptionStatus": "ERROR"')
    );
  } catch {
    return false;
  }
}

/**
 * Whether the query response indicates another page of results.
 * Matches the REST client's effective limit clamping.
 */
export function hasPreferenceQueryNextPage(
  nodes: unknown[],
  cursor: string | undefined,
  identifiersLength: number,
  limit?: number,
): boolean {
  if (!cursor) {
    return false;
  }
  const effectiveLimit = Math.max(1, Math.min(50, limit ?? identifiersLength));
  if (nodes.length < effectiveLimit) {
    return false;
  }
  return !isTerminalPreferenceQueryCursor(cursor);
}

export function createPreferencesQueryTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'preferences_query',
    description:
      'Query consent preferences for multiple users by their identifiers. ' +
      'hasNextPage is true only when a cursor is present and the page is full; ' +
      'stop paging if a follow-up returns empty or nodes show system.decryptionStatus ERROR.',
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

      const hasNextPage = hasPreferenceQueryNextPage(
        result.nodes,
        result.cursor,
        identifiers.length,
        limit,
      );

      return createListResult(result.nodes, {
        hasNextPage,
        ...(hasNextPage && result.cursor ? { cursor: result.cursor } : {}),
      });
    },
  });
}
