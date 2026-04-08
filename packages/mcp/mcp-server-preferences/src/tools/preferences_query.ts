import {
  createListResult,
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { QueryPreferencesSchema } from '../schemas.js';

export function createPreferencesQueryTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'preferences_query',
    description: 'Query consent preferences for multiple users by their identifiers',
    category: 'Preference Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        partition: {
          type: 'string',
          description: 'Partition/organization context',
        },
        identifiers: {
          type: 'array',
          description: 'Array of identifier objects to query',
          items: {
            type: 'object',
          },
        },
      },
      required: ['partition', 'identifiers'],
    },
    handler: async (args) => {
      const parsed = validateArgs(QueryPreferencesSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const identifiers = parsed.data.identifiers.map((id) => ({
          value: id.value,
          type: id.type,
        }));

        const result = await rest.queryPreferences({
          partition: parsed.data.partition,
          identifiers,
        });

        return createListResult(result, {
          totalCount: result.length,
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
