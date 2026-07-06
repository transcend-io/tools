import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import { getIndex, type DocEntry } from '../docsIndex.js';

export const DocsListSchema = z.object({
  section: z
    .string()
    .optional()
    .describe('Filter articles to this llms.txt section name (exact match).'),
  keyword: z
    .string()
    .optional()
    .describe('Case-insensitive substring filter applied to article titles.'),
});
export type DocsListInput = z.infer<typeof DocsListSchema>;

function filterEntries(entries: DocEntry[], section?: string, keyword?: string) {
  let result = entries;
  if (section) {
    result = result.filter((entry) => entry.section === section);
  }
  if (keyword) {
    const lower = keyword.toLowerCase();
    result = result.filter((entry) => entry.title.toLowerCase().includes(lower));
  }
  return result.map(({ title, section: entrySection, url }) => ({
    title,
    section: entrySection,
    url,
  }));
}

export function createDocsListTool(_clients?: ToolClients) {
  return defineTool({
    name: 'transcend_docs_list',
    description:
      'List Transcend documentation articles from the public docs index. ' +
      'Pick the best matching url, then call transcend_docs_fetch for full markdown content.',
    category: 'Documentation',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: DocsListSchema,
    handler: async ({ section, keyword }) => {
      const entries = await getIndex();
      const filtered = filterEntries(entries, section, keyword);
      return createListResult(filtered, { totalCount: filtered.length });
    },
  });
}
