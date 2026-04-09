import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-core';

export const downloadKeysSchema = z.object({
  request_id: z.string().describe('ID of the completed DSR'),
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
    zodSchema: downloadKeysSchema,
    handler: async ({ request_id }) => {
      const keys = await rest.getDSRDownloadKeys(request_id);
      return createToolResult(true, {
        downloadKeys: keys,
        count: keys.length,
      });
    },
  });
}
