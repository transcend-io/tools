import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-base';

export const respondAccessSchema = z.object({
  nonce: z
    .string()
    .describe('JWT nonce from webhook header or pending-requests for this data silo job'),
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
      'Respond to an ACCESS request by uploading user data. Requires a nonce from the webhook or pending-requests.',
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
