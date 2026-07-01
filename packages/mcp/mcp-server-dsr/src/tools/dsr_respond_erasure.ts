import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-base';

export const respondErasureSchema = z.object({
  requestId: z.string().describe('ID of the DSR'),
  dataSiloId: z.string().describe('ID of the data silo that completed erasure'),
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
    description: 'Confirm that data erasure has been completed for a data silo',
    category: 'DSR Automation',
    readOnly: false,
    confirmationHint: 'Confirms erasure completion for the data silo',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: respondErasureSchema,
    handler: async ({ requestId, dataSiloId, profileIds }) => {
      const result = await rest.confirmErasure({
        requestId,
        dataSiloId,
        profileIds,
      });
      return createToolResult(true, {
        ...result,
        message: 'Erasure confirmation submitted successfully',
      });
    },
  });
}
