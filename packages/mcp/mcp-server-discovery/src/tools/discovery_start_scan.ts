import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { DiscoveryMixin } from '../graphql.js';
import { StartScanSchema } from '../schemas.js';

export function createDiscoveryStartScanTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as DiscoveryMixin;
  return {
    name: 'discovery_start_scan',
    description: 'Start a new data classification scan on a data silo.',
    category: 'Data Discovery',
    readOnly: false,
    confirmationHint: 'Starts a new classification scan on the data silo',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for the classification scan',
        },
        data_silo_id: {
          type: 'string',
          description: 'ID of the data silo to scan (optional)',
        },
        type: {
          type: 'string',
          description: 'Type of scan (optional)',
        },
      },
      required: ['name'],
    },
    handler: async (args) => {
      const parsed = validateArgs(StartScanSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.startClassificationScan({
          name: parsed.data.name,
          dataSiloId: parsed.data.data_silo_id,
          type: parsed.data.type,
        });
        return createToolResult(true, {
          scan: result,
          message: `Classification scan "${parsed.data.name}" started successfully`,
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
