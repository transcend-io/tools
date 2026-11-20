import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { DOCS_TOKEN_ENV, getDoc, resolveDocsTier } from '../docsIndex.js';

/** Maximum markdown characters returned per article (long pages are truncated). */
const MAX_BODY_CHARS = 120_000;

export const DocsFetchSchema = z.object({
  url: z
    .string()
    .url()
    .describe('Absolute https URL of a docs.transcend.io article (.md) from docs_list.'),
});
export type DocsFetchInput = z.infer<typeof DocsFetchSchema>;

function formatBody(body: string, url: string): string {
  const truncated =
    body.length > MAX_BODY_CHARS ? `${body.slice(0, MAX_BODY_CHARS)}\n\n...(truncated)` : body;
  return `${truncated}\n\nSource: ${url}`;
}

/** Tells the caller why a preview came back and how to get the full article. */
function previewNotice(hasToken: boolean): string {
  return hasToken
    ? 'Preview only. This page is signed-in only, and docs.transcend.io did not return the ' +
        `full article for the token that was sent. Check that ${DOCS_TOKEN_ENV} or your ` +
        'sign-in belongs to a Transcend user with docs access.'
    : 'Preview only. This page is signed-in only, so this is the public preview. For the full ' +
        `article, sign in to the Transcend MCP (OAuth or API key) or set ${DOCS_TOKEN_ENV}, ` +
        'then call docs_fetch again.';
}

export function createDocsFetchTool(_clients?: ToolClients) {
  return defineTool({
    name: 'docs_fetch',
    description:
      'Fetch full markdown content for a Transcend documentation article by URL. ' +
      'Use urls returned by docs_list. A signed-in-only page returns a preview with ' +
      'sign-in steps unless the caller is signed in.',
    category: 'Documentation',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: DocsFetchSchema,
    handler: async ({ url }) => {
      const { markdown, access, preview } = await getDoc(url);
      const body = formatBody(markdown, url);
      return createToolResult(true, {
        url,
        ...(access && { access }),
        ...(preview && { preview: true }),
        markdown: preview ? `${previewNotice(Boolean(resolveDocsTier().token))}\n\n${body}` : body,
      });
    },
  });
}
