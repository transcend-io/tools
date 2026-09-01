import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-base';

export const respondAccessSchema = z.object({
  nonce: z
    .string()
    .describe(
      'Sombra-signed JWT from dsr_list_pending_requests item.nonce (or the job webhook ' +
        'x-transcend-nonce header). Never invent a JWT; never pass encryptedCekContext.',
    ),
  profiles: z
    .array(
      z.object({
        profileId: z.string().optional().describe('Profile identifier'),
        profileData: z.record(z.string(), z.unknown()).optional().describe('Profile data payload'),
      }),
    )
    .optional()
    .describe('Profile data objects to return for the access request'),
});
export type RespondAccessInput = z.infer<typeof respondAccessSchema>;

export function createDsrRespondAccessTool(clients: ToolClients) {
  const { rest } = clients;

  return defineTool({
    name: 'dsr_respond_access',
    description:
      'Respond to an ACCESS fulfillment job by uploading user data. MCP flow: resolve dataSiloId ' +
      '(e.g. dsr_list_request_data_silos) → dsr_list_pending_requests with requestType ACCESS → ' +
      "match the pending item for this requestId → pass that item's nonce here. Do not reuse an " +
      'enrichment-stage nonce for fulfillment. Requires Sombra. Listing pending jobs needs a ' +
      'Transcend API key associated with that data silo (not OAuth-only).',
    category: 'DSR Automation',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    requireSombra: true,
    zodSchema: respondAccessSchema,
    handler: async ({ nonce, profiles }) => {
      const result = await rest.respondToAccess({
        nonce,
        profiles,
      });
      return createToolResult(true, {
        ...result,
        message: 'Access response submitted successfully',
      });
    },
  });
}
