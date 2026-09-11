import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-base';

export const enrichIdentifiersSchema = z
  .object({
    nonce: z
      .string()
      .optional()
      .describe(
        'Preferred: Sombra-signed JWT from dsr_list_pending_requests item.nonce for the ' +
          'enrichment stage (or webhook x-transcend-nonce). Never invent; never use encryptedCekContext.',
      ),
    requestId: z
      .string()
      .optional()
      .describe(
        'Alternate (no nonce): privacy request ID together with enricherId ' +
          '(sent as x-transcend-request-id). Respond paths still need a real nonce.',
      ),
    enricherId: z
      .string()
      .optional()
      .describe(
        'Alternate (no nonce): enricher ID together with requestId ' +
          '(sent as x-transcend-enricher-id). Discover via dsr_get_details → requestEnrichers[].enricher.id.',
      ),
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
      'Enrich a Data Subject Request with additional identifiers during preflight. Prefer a ' +
      'nonce from dsr_list_pending_requests (enrichment stage) or the webhook. Alternate with no ' +
      'nonce: pass requestId + enricherId (official enrich-only header path). Access/erasure ' +
      'respond tools still require a real fulfillment nonce. Requires Sombra. Listing pending ' +
      'jobs needs a Transcend API key associated with that data silo (not OAuth-only).',
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
