import {
  createListResult,
  createToolResult,
  defineTool,
  PaginationSchema,
  type ToolClients,
  z,
} from '@transcend-io/mcp-server-core';

const listIdentifiersSchema = z
  .object({
    request_id: z.string(),
  })
  .merge(PaginationSchema);

export function createDsrListIdentifiersTool(clients: ToolClients) {
  const { rest } = clients;

  return defineTool({
    name: 'dsr_list_identifiers',
    description: 'List all identifiers attached to a Data Subject Request',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: listIdentifiersSchema,
    handler: async ({ request_id }) => {
      try {
        const identifiers = await rest.listRequestIdentifiers(request_id);
        return createListResult(identifiers);
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
