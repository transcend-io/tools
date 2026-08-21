import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { getIndex } from '../docsIndex.js';
import { searchDocs } from '../docsSearch.js';

export const DocsListSchema = z.object({
  section: z
    .string()
    .optional()
    .describe('Filter articles to this llms.txt section name (exact match).'),
  keyword: z
    .string()
    .optional()
    .describe(
      'Full-text query over article titles, URL paths, sections, and bodies. ' +
        'Use a natural-language or term query (not a guessed title). Omit to list the catalog.',
    ),
});
export type DocsListInput = z.infer<typeof DocsListSchema>;

export function createDocsListTool(_clients?: ToolClients) {
  return defineTool({
    name: 'docs_list',
    description:
      'List or full-text search Transcend documentation. When keyword is set, ranks articles ' +
      '(titles and bodies) and returns snippets. Pick the best matching url, then call docs_fetch.',
    category: 'Documentation',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: DocsListSchema,
    handler: async ({ section, keyword }) => {
      const query = keyword?.trim();
      if (query) {
        const { hits, totalCount } = await searchDocs(query, { section });
        return createListResult(hits, { totalCount });
      }

      const entries = await getIndex();
      const filtered = section ? entries.filter((entry) => entry.section === section) : entries;
      return createListResult(
        filtered.map(({ title, section: entrySection, url }) => ({
          title,
          section: entrySection,
          url,
        })),
        { totalCount: filtered.length },
      );
    },
  });
}
