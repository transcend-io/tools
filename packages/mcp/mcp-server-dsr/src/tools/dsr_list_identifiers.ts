import {
  createListResult,
  createToolResult,
  PaginationSchema,
  type ToolClients,
  type ToolDefinition,
  z,
} from '@transcend-io/mcp-server-core';

const listIdentifiersSchema = z
  .object({
    request_id: z.string(),
  })
  .merge(PaginationSchema);

export function createDsrListIdentifiersTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;

  return {
    name: 'dsr_list_identifiers',
    description: 'List all identifiers attached to a Data Subject Request',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: listIdentifiersSchema,
    handler: async (args) => {
      try {
        const identifiers = await rest.listRequestIdentifiers(args.request_id);
        return createListResult(identifiers);
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
