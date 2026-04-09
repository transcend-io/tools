import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-core';

export const enrichIdentifiersSchema = z.object({
  request_id: z.string().describe('ID of the DSR to enrich'),
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
    confirmationHint: 'Adds identifiers to the DSR during preflight',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: enrichIdentifiersSchema,
    handler: async ({ request_id, identifiers }) => {
      const result = await rest.enrichIdentifiers({
        requestId: request_id,
        identifiers,
      });
      return createToolResult(true, {
        ...result,
        message: 'Identifiers enriched successfully',
      });
    },
  });
}
