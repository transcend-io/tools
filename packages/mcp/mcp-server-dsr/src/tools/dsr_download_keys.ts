import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { DownloadKeysSchema } from '../schemas.js';

export function createDsrDownloadKeysTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;

  return {
    name: 'dsr_download_keys',
    description:
      'Get download keys for a completed Data Subject Request. These keys can be used to download the DSR results.',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        request_id: {
          type: 'string',
          description: 'ID of the completed DSR',
        },
      },
      required: ['request_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(DownloadKeysSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const keys = await rest.getDSRDownloadKeys(parsed.data.request_id);
        return createToolResult(true, {
          downloadKeys: keys,
          count: keys.length,
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
