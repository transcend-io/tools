import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-base';

export const respondAccessSchema = z.object({
  requestId: z.string().describe('ID of the DSR'),
  dataSiloId: z.string().describe('ID of the data silo responding'),
  profiles: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Array of profile data objects to return'),
});
export type RespondAccessInput = z.infer<typeof respondAccessSchema>;

export function createDsrRespondAccessTool(clients: ToolClients) {
  const { rest } = clients;

  return defineTool({
    name: 'dsr_respond_access',
    description: 'Respond to an ACCESS request by uploading user data',
    category: 'DSR Automation',
    readOnly: false,
    confirmationHint: 'Uploads access response data for the DSR',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: respondAccessSchema,
    handler: async ({ requestId, dataSiloId, profiles }) => {
      const result = await rest.respondToAccess({
        requestId,
        dataSiloId,
        profiles: profiles as Record<string, unknown>[] | undefined,
      });
      return createToolResult(true, {
        ...result,
        message: 'Access response submitted successfully',
      });
    },
  });
}
