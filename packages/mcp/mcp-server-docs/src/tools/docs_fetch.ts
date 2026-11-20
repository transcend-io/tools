import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { assertDocsHost, getBody, getRouteIndex } from '../docsIndex.js';
import { dashboardPagesForDocUrl } from '../docsRoutes.js';

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

export function createDocsFetchTool(_clients?: ToolClients) {
  return defineTool({
    name: 'docs_fetch',
    description:
      'Fetch docs markdown by URL from docs_list. Response includes dashboardPages with app URLs when mapped.',
    category: 'Documentation',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: DocsFetchSchema,
    handler: async ({ url }) => {
      assertDocsHost(url);
      const body = await getBody(url);
      let dashboardPages: ReturnType<typeof dashboardPagesForDocUrl> = [];
      try {
        const routeData = await getRouteIndex();
        dashboardPages = dashboardPagesForDocUrl(routeData, url);
      } catch {
        // Route index is optional; markdown alone is still useful.
      }
      return createToolResult(true, {
        url,
        markdown: formatBody(body, url),
        ...(dashboardPages.length > 0 && { dashboardPages }),
      });
    },
  });
}
