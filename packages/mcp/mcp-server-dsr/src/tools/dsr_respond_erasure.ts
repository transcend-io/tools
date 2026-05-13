import {
  createToolResult,
  defineTool,
  envelopeSchema,
  type ToolClients,
  z,
} from '@transcend-io/mcp-server-base';

export const respondErasureSchema = z.object({
  request_id: z.string().describe('ID of the DSR'),
  data_silo_id: z.string().describe('ID of the data silo that completed erasure'),
  profile_ids: z
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
    outputZodSchema: envelopeSchema(
      z.object({
        success: z.boolean().optional(),
        message: z.string(),
      }),
    ),
    handler: async ({ request_id, data_silo_id, profile_ids }) => {
      const result = await rest.confirmErasure({
        requestId: request_id,
        dataSiloId: data_silo_id,
        profileIds: profile_ids,
      });
      return createToolResult(true, {
        ...result,
        message: 'Erasure confirmation submitted successfully',
      });
    },
  });
}
