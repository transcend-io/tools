import {
  createListResult,
  defineTool,
  PaginationSchema,
  type ToolClients,
  z,
} from '@transcend-io/mcp-server-base';

export const listIdentifiersSchema = z
  .object({
    requestId: z.string().describe('ID of the DSR'),
  })
  .merge(PaginationSchema);
export type ListIdentifiersInput = z.infer<typeof listIdentifiersSchema>;

export function createDsrListIdentifiersTool(clients: ToolClients) {
  const { rest } = clients;

  return defineTool({
    name: 'dsr_list_identifiers',
    description: 'List all identifiers attached to a Data Subject Request',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    requireSombra: true,
    zodSchema: listIdentifiersSchema,
    handler: async ({ requestId }) => {
      const identifiers = await rest.listRequestIdentifiers(requestId);
      return createListResult(identifiers);
    },
  });
}
