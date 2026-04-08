import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { DiscoveryMixin } from '../graphql.js';
import { GetScanSchema } from '../schemas.js';

export function createDiscoveryGetScanTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as DiscoveryMixin;
  return {
    name: 'discovery_get_scan',
    description: 'Get detailed information about a specific classification scan including results.',
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        scan_id: {
          type: 'string',
          description: 'ID of the classification scan to retrieve',
        },
      },
      required: ['scan_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(GetScanSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.getClassificationScan(parsed.data.scan_id);
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
