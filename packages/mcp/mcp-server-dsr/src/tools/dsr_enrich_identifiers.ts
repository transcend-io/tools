import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { EnrichIdentifiersSchema } from '../schemas.js';

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
    inputSchema: {
      type: 'object',
      properties: {
        request_id: {
          type: 'string',
          description: 'ID of the DSR to enrich',
        },
        identifiers: {
          type: 'object',
          description: 'Key-value pairs of identifier names and values to add',
        },
      },
      required: ['request_id', 'identifiers'],
    },
    handler: async (args) => {
      const parsed = validateArgs(EnrichIdentifiersSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await rest.enrichIdentifiers({
          requestId: parsed.data.request_id,
          identifiers: parsed.data.identifiers,
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
