import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-base';

export const downloadKeysSchema = z.object({
  requestId: z.string().describe('ID of the completed DSR'),
});
export type DownloadKeysInput = z.infer<typeof downloadKeysSchema>;

export function createDsrDownloadKeysTool(clients: ToolClients) {
  const { rest } = clients;

  return defineTool({
    name: 'dsr_download_keys',
    description:
      'Get download keys for a completed Data Subject Request. These keys can be used to download the DSR results.',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    requireSombra: true,
    zodSchema: downloadKeysSchema,
    handler: async ({ requestId }) => {
      const keys = await rest.getDSRDownloadKeys(requestId);
      return createToolResult(true, {
        downloadKeys: keys,
        count: keys.length,
      });
    },
  });
}
