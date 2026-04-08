import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';
import { CreateDataSiloSchema } from '../schemas.js';

export function createInventoryCreateDataSiloTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as InventoryMixin;
  return {
    name: 'inventory_create_data_silo',
    description:
      'Create a new data silo (data system or integration). The name must match an integration name from the Transcend catalog.',
    category: 'Data Inventory',
    readOnly: false,
    confirmationHint: 'Creates a new data silo in the inventory',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description:
            'Name/title of the data silo (must match an integrationName in the Transcend catalog, e.g. "Salesforce", "Stripe")',
        },
      },
      required: ['title'],
    },
    handler: async (args) => {
      const parsed = validateArgs(CreateDataSiloSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.createDataSilo({
          name: parsed.data.title,
        });
        return createToolResult(true, {
          dataSilo: result,
          message: `Data silo "${parsed.data.title}" created successfully`,
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
