import {
  createToolResult,
  type ToolClients,
  type ToolDefinition,
  z,
} from '@transcend-io/mcp-server-core';

const downloadKeysSchema = z.object({
  request_id: z.string(),
});

export function createDsrDownloadKeysTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;

  return {
    name: 'dsr_download_keys',
    description:
      'Get download keys for a completed Data Subject Request. These keys can be used to download the DSR results.',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: downloadKeysSchema,
    handler: async (args) => {
      try {
        const keys = await rest.getDSRDownloadKeys(args.request_id);
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
