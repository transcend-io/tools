import {
  createToolResult,
  type ToolClients,
  type ToolDefinition,
  z,
} from '@transcend-io/mcp-server-core';

const enrichIdentifiersSchema = z.object({
  request_id: z.string(),
  identifiers: z.record(z.string(), z.string()),
});

export function createDsrEnrichIdentifiersTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;

  return {
    name: 'dsr_enrich_identifiers',
    description:
      'Enrich a Data Subject Request with additional identifiers during preflight processing',
    category: 'DSR Automation',
    readOnly: false,
    confirmationHint: 'Adds identifiers to the DSR during preflight',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: enrichIdentifiersSchema,
    handler: async (args) => {
      try {
        const result = await rest.enrichIdentifiers({
          requestId: args.request_id,
          identifiers: args.identifiers,
        });
        return createToolResult(true, {
          ...result,
          message: 'Identifiers enriched successfully',
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
