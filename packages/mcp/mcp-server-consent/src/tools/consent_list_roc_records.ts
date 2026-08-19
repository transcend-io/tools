import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

export const ConsentListRocRecordsSchema = z.object({
  // TODO: replace with the arguments this tool takes. Every field needs a
  // description: it is what the model reads to decide how to call this, and
  // `scripts/check-mcp-descriptions.test.ts` fails a registered tool without one.
  query: z.string().describe('TODO: what this argument selects.'),
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
    name: 'consent_consent_list_roc_records',
    description: 'TODO: what this returns, and when the model should call it.',
    category: 'TODO',
    // `readOnly` gates whether the tool is offered in a read-only session; the
    // annotations are hints a host may show. Flip them together for a mutating tool.
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ConsentListRocRecordsSchema,
    handler: async ({ query }) =>
      createToolResult(true, {
        // TODO: return the data this tool exists to fetch.
        query,
      }),
  });
}
