import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-base';

export const enrichIdentifiersSchema = z.object({
  requestId: z.string().describe('ID of the DSR to enrich'),
  identifiers: z
    .record(z.string(), z.string())
    .describe('Key-value pairs of identifier names and values to add'),
});
export type EnrichIdentifiersInput = z.infer<typeof enrichIdentifiersSchema>;

export function createDsrEnrichIdentifiersTool(clients: ToolClients) {
  const { rest } = clients;

  return defineTool({
    name: 'dsr_enrich_identifiers',
    description:
      'Enrich a Data Subject Request with additional identifiers during preflight processing',
    category: 'DSR Automation',
    readOnly: false,
    confirmation: {
      hint:
        'Adds identifiers to a request already in flight, widening whose data it reaches. An ' +
        "extra identifier on an erasure can delete the wrong person's records. Check the " +
        'identifiers in the call arguments before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    requireSombra: true,
    zodSchema: enrichIdentifiersSchema,
    handler: async ({ requestId, identifiers }) => {
      const result = await rest.enrichIdentifiers({
        requestId,
        identifiers,
      });
      return createToolResult(true, {
        ...result,
        message: 'Identifiers enriched successfully',
      });
    },
  });
}
