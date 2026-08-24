import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  type ToolClients,
  z,
} from '@transcend-io/mcp-server-base';

export const listIdentifiersSchema = OffsetPaginationSchema.extend({
  requestId: z.string().describe('ID of the DSR'),
});
export type ListIdentifiersInput = z.infer<typeof listIdentifiersSchema>;

export function createDsrListIdentifiersTool(clients: ToolClients) {
  const { rest } = clients;

  return defineTool({
    name: 'dsr_list_identifiers',
    description: 'List decrypted identifiers attached to a Data Subject Request.',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    requireSombra: true,
    zodSchema: listIdentifiersSchema,
    handler: async ({ requestId, first, offset }) => {
      const identifiers = await rest.listRequestIdentifiers(requestId, { first, offset });

      const hasNextPage = identifiers.length === first;

      return createListResult(identifiers, { hasNextPage });
    },
  });
}
