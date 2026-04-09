import {
  createToolResult,
  type ToolClients,
  type ToolDefinition,
  z,
} from '@transcend-io/mcp-server-core';

const respondAccessSchema = z.object({
  request_id: z.string(),
  data_silo_id: z.string(),
  profiles: z.array(z.record(z.string(), z.unknown())).optional(),
});

export function createDsrRespondAccessTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;

  return {
    name: 'dsr_respond_access',
    description: 'Respond to an ACCESS request by uploading user data',
    category: 'DSR Automation',
    readOnly: false,
    confirmationHint: 'Uploads access response data for the DSR',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: respondAccessSchema,
    handler: async (args) => {
      try {
        const result = await rest.respondToAccess({
          requestId: args.request_id,
          dataSiloId: args.data_silo_id,
          profiles: args.profiles as Record<string, unknown>[] | undefined,
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
  };
}
