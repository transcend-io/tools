import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { assertDocsHost, getBody } from '../docsIndex.js';

/** Maximum markdown characters returned per article (long pages are truncated). */
const MAX_BODY_CHARS = 120_000;

export const DocsFetchSchema = z.object({
  url: z
    .string()
    .url()
    .describe('Absolute https URL of a docs.transcend.io article (.md) from transcend_docs_list.'),
});
export type DocsFetchInput = z.infer<typeof DocsFetchSchema>;

function formatBody(body: string, url: string): string {
  const truncated =
    body.length > MAX_BODY_CHARS ? `${body.slice(0, MAX_BODY_CHARS)}\n\n...(truncated)` : body;
  return `${truncated}\n\nSource: ${url}`;
}

export function createDocsFetchTool(_clients?: ToolClients) {
  return defineTool({
    name: 'transcend_docs_fetch',
    description:
      'Fetch full markdown content for a Transcend documentation article by URL. ' +
      'Use urls returned by transcend_docs_list.',
    category: 'Documentation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: DocsFetchSchema,
    handler: async ({ url }) => {
      assertDocsHost(url);
      const body = await getBody(url);
      return createToolResult(true, {
        url,
        markdown: formatBody(body, url),
      });
    },
  });
}
