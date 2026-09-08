import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

export const ConsentListRocRecordsSchema = z.object({
  partition: z
    .string()
    .describe('The consent partition (airgap bundle id) the lookup is scoped to'),
  limit: z
    .number()
    .describe('Maximum number of records to return (1-200); omit to return the full timeline'),
  includeRawRequest: z.boolean().describe('Whether to include the raw request in the response'),
});
export type ConsentListRocRecordsInput = z.infer<typeof ConsentListRocRecordsSchema>;

/**
 * TODO: describe what this tool does and when the model should reach for it.
 *
 * Not registered yet. Add `createConsentListRocRecordsTool()` to the array its package returns from
 * `src/tools/index.ts`, which is the point at which the name and description
 * below become public API.
 *
 * `ToolClients` carries the GraphQL and REST clients. Drop the underscore to use
 * them, or the parameter entirely for a tool that calls nothing.
 */
export function createConsentListRocRecordsTool(_clients?: ToolClients) {
  return defineTool({
    name: 'consent_list_roc_records',
    description: 'List all ROC records for a given user in a partition.',
    category: 'Consent Management',
    readOnly: true,
    requireAuth: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ConsentListRocRecordsSchema,
    handler: async ({ partition, limit, includeRawRequest }) =>
      createToolResult(true, {
        // TODO: return the data this tool exists to fetch.
        partition,
        limit,
        includeRawRequest,
      }),
  });
}
