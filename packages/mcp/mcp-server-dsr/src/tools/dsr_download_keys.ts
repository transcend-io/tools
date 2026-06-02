import {
  createToolResult,
  defineTool,
  DownloadKeySchema,
  envelopeSchema,
  type ToolClients,
  z,
} from '@transcend-io/mcp-server-base';

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
    outputZodSchema: envelopeSchema(
      z.object({
        downloadKeys: z.array(DownloadKeySchema),
        count: z.number(),
      }),
    ),
    handler: async ({ request_id }) => {
      const keys = await rest.getDSRDownloadKeys(request_id);
      return createToolResult(true, {
        downloadKeys: keys,
        count: keys.length,
      });
    },
  });
}
