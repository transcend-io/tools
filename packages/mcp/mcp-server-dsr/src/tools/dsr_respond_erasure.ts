import {
  createToolResult,
  type ToolClients,
  type ToolDefinition,
  z,
} from '@transcend-io/mcp-server-core';

const respondErasureSchema = z.object({
  request_id: z.string(),
  data_silo_id: z.string(),
  profile_ids: z.array(z.string()).optional(),
});

export function createDsrRespondErasureTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;

  return {
    name: 'dsr_respond_erasure',
    description: 'Confirm that data erasure has been completed for a data silo',
    category: 'DSR Automation',
    readOnly: false,
    confirmationHint: 'Confirms erasure completion for the data silo',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: respondErasureSchema,
    handler: async (args) => {
      try {
        const result = await rest.confirmErasure({
          requestId: args.request_id,
          dataSiloId: args.data_silo_id,
          profileIds: args.profile_ids,
        });
        return createToolResult(true, {
          ...result,
          message: 'Erasure confirmation submitted successfully',
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
