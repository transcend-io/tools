import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-core';

const respondAccessSchema = z.object({
  request_id: z.string().describe('ID of the DSR'),
  data_silo_id: z.string().describe('ID of the data silo responding'),
  profiles: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Array of profile data objects to return'),
});

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
    handler: async ({ request_id, data_silo_id, profiles }) => {
      try {
        const result = await rest.respondToAccess({
          requestId: request_id,
          dataSiloId: data_silo_id,
          profiles: profiles as Record<string, unknown>[] | undefined,
        });
        return createToolResult(true, {
          ...result,
          message: 'Access response submitted successfully',
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });
}
