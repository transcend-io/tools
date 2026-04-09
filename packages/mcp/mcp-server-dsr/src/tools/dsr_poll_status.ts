import {
  createToolResult,
  type ToolClients,
  type ToolDefinition,
  z,
} from '@transcend-io/mcp-server-core';

const pollStatusSchema = z.object({
  request_id: z.string(),
});

export function createDsrPollStatusTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;

  return {
    name: 'dsr_poll_status',
    description: 'Poll the current status of a Data Subject Request',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: pollStatusSchema,
    handler: async (args) => {
      try {
        const result = await rest.getDSRStatus(args.request_id);
        return createToolResult(true, result);
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
