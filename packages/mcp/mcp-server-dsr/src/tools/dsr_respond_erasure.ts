import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-base';

export const respondErasureSchema = z.object({
  nonce: z
    .string()
    .describe('JWT nonce from webhook header or pending-requests for this data silo job'),
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
      'Confirm that data erasure has been completed for a data silo. Requires a nonce from the webhook or pending-requests.',
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
