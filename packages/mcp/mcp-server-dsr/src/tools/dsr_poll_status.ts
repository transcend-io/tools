import {
  createToolResult,
  defineTool,
  DSRResponseSchema,
  envelopeSchema,
  type ToolClients,
  z,
} from '@transcend-io/mcp-server-base';

export const pollStatusSchema = z.object({
  request_id: z.string().describe('ID of the DSR to check'),
});
export type PollStatusInput = z.infer<typeof pollStatusSchema>;

export function createDsrPollStatusTool(clients: ToolClients) {
  const { rest } = clients;

  return defineTool({
    name: 'dsr_poll_status',
    description: 'Poll the current status of a Data Subject Request',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: pollStatusSchema,
    outputZodSchema: envelopeSchema(DSRResponseSchema),
    handler: async ({ request_id }) => {
      const result = await rest.getDSRStatus(request_id);
      return createToolResult(true, result);
    },
  });
}
