import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-base';

export const respondErasureSchema = z.object({
  nonce: z
    .string()
    .describe(
      'Sombra-signed JWT from dsr_list_pending_requests item.nonce (or the job webhook ' +
        'x-transcend-nonce header). Never invent a JWT; never pass encryptedCekContext.',
    ),
  profileIds: z
    .array(z.string())
    .optional()
    .describe('IDs of profiles that were erased (optional)'),
});
export type RespondErasureInput = z.infer<typeof respondErasureSchema>;

export function createDsrRespondErasureTool(clients: ToolClients) {
  const { rest } = clients;

  return defineTool({
    name: 'dsr_respond_erasure',
    description:
      'Confirm that data erasure has been completed for a data silo. MCP flow: resolve dataSiloId → ' +
      'dsr_list_pending_requests with requestType ERASURE → match the pending item for this ' +
      "requestId → pass that item's nonce here. Do not reuse an enrichment-stage nonce. Requires " +
      'Sombra. Listing pending jobs needs a Transcend API key associated with that data silo ' +
      '(not OAuth-only).',
    category: 'DSR Automation',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    requireSombra: true,
    zodSchema: respondErasureSchema,
    handler: async ({ nonce, profileIds }) => {
      const result = await rest.confirmErasure({
        nonce,
        profileIds,
      });
      return createToolResult(true, {
        ...result,
        message: 'Erasure confirmation submitted successfully',
      });
    },
  });
}
