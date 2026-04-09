import {
  createListResult,
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';
import { PURPOSES, type TranscendCliPurposesResponse } from '@transcend-io/sdk';

import { ListPurposesSchema } from '../schemas.js';

export function createConsentListPurposesTool(clients: ToolClients): ToolDefinition {
  return {
    name: 'consent_list_purposes',
    description: 'List all tracking purposes configured for consent management (max ~100 results).',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Results per page (1-100, default: 50)',
        },
      },
      required: [],
    },
    handler: async (args) => {
      const parsed = validateArgs(ListPurposesSchema, args);
      if (!parsed.success) return parsed.error;
      const { limit } = parsed.data;
      try {
        const data = await clients.graphql.makeRequest<TranscendCliPurposesResponse>(PURPOSES, {
          first: Math.min(limit, 100),
        });

        return createListResult(data.purposes.nodes, {
          totalCount: data.purposes.totalCount,
          hasNextPage: data.purposes.nodes.length < data.purposes.totalCount,
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
