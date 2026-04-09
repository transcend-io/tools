import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-core';

const pollStatusSchema = z.object({
  request_id: z.string(),
});

export function createDsrPollStatusTool(clients: ToolClients) {
  const { rest } = clients;

  return defineTool({
    name: 'dsr_poll_status',
    description: 'Poll the current status of a Data Subject Request',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: pollStatusSchema,
    handler: async ({ request_id }) => {
      try {
        const result = await rest.getDSRStatus(request_id);
        return createToolResult(true, result);
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
