import {
  createListResult,
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';
import { EXPERIENCES, type TranscendCliExperiencesResponse } from '@transcend-io/sdk';

import { ListRegimesSchema } from '../schemas.js';

export function createConsentListRegimesTool(clients: ToolClients): ToolDefinition {
  return {
    name: 'consent_list_regimes',
    description:
      'List all consent experiences (regional regimes) configured for your organization. ' +
      'Returns experience name, regions, purposes, opted-out purposes, and view state.',
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
        offset: {
          type: 'number',
          description: 'Offset for pagination (default: 0)',
        },
      },
      required: [],
    },
    handler: async (args) => {
      const parsed = validateArgs(ListRegimesSchema, args);
      if (!parsed.success) return parsed.error;
      const { limit, offset } = parsed.data;
      try {
        const data = await clients.graphql.makeRequest<TranscendCliExperiencesResponse>(
          EXPERIENCES,
          {
            first: limit,
            offset,
          },
        );

        const { totalCount, nodes } = data.experiences;
        return createListResult(nodes, {
          totalCount,
          hasNextPage: (offset ?? 0) + nodes.length < totalCount,
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
