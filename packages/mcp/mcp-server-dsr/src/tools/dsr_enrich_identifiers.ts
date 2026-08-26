import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-base';

export const enrichIdentifiersSchema = z
  .object({
    nonce: z
      .string()
      .optional()
      .describe('JWT nonce from webhook header or pending-requests (preferred)'),
    requestId: z
      .string()
      .optional()
      .describe('Request ID for manual enrichment when nonce is unavailable'),
    enricherId: z
      .string()
      .optional()
      .describe('Enricher ID for manual enrichment when nonce is unavailable'),
    identifiers: z
      .record(z.string(), z.string())
      .describe('Key-value pairs of identifier names and values to add'),
  })
  .refine(
    (input) => Boolean(input.nonce) || (Boolean(input.requestId) && Boolean(input.enricherId)),
    {
      message: 'Either nonce or both requestId and enricherId are required',
    },
  );
export type EnrichIdentifiersInput = z.infer<typeof enrichIdentifiersSchema>;

export function createDsrEnrichIdentifiersTool(clients: ToolClients) {
  const { rest } = clients;

  return defineTool({
    name: 'dsr_enrich_identifiers',
    description:
      'Enrich a Data Subject Request with additional identifiers during preflight processing. Requires a nonce from the webhook or pending-requests, or requestId + enricherId for manual enrichment.',
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
    handler: async ({ nonce, requestId, enricherId, identifiers }) => {
      const result = await rest.enrichIdentifiers({
        nonce,
        requestId,
        enricherId,
        identifiers,
      });
      return createToolResult(true, {
        ...result,
        message: 'Identifiers enriched successfully',
      });
    },
  });
}
