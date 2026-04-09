import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';
import { UpdateDataSiloSchema } from '../schemas.js';

export function createInventoryUpdateDataSiloTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as InventoryMixin;
  return {
    name: 'inventory_update_data_silo',
    description: 'Update an existing data silo',
    category: 'Data Inventory',
    readOnly: false,
    confirmationHint: 'Updates the data silo configuration',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        data_silo_id: {
          type: 'string',
          description: 'ID of the data silo to update',
        },
        title: {
          type: 'string',
          description: 'New title for the data silo',
        },
        description: {
          type: 'string',
          description: 'New description',
        },
      },
      required: ['data_silo_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(UpdateDataSiloSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.updateDataSilo({
          id: parsed.data.data_silo_id,
          title: parsed.data.title,
          description: parsed.data.description,
        });
        return createToolResult(true, {
          dataSilo: result,
          message: 'Data silo updated successfully',
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
