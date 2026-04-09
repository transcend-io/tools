import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';
import { GetDataSiloSchema } from '../schemas.js';

export function createInventoryGetDataSiloTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as InventoryMixin;
  return {
    name: 'inventory_get_data_silo',
    description:
      'Get detailed information about a specific data silo including its data points and identifiers',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        data_silo_id: {
          type: 'string',
          description: 'ID of the data silo to retrieve',
        },
      },
      required: ['data_silo_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(GetDataSiloSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.getDataSilo(parsed.data.data_silo_id);
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
