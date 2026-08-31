import {
  createListResult,
  defineTool,
  ErrorCode,
  groupBy,
  ToolError,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import { getIndex } from '../docsIndex.js';
import { searchDocs } from '../docsSearch.js';

/**
 * Cap on articles returned when listing a section. A listing entry is a title
 * and a URL, roughly a fifth the size of a ranked hit with its snippet, so this
 * sits above the search limit; the largest section would otherwise return 125
 * articles and ~22KB.
 */
const SECTION_LISTING_LIMIT = 50;

export const DocsListSchema = z.object({
  section: z
    .string()
    .optional()
    .describe(
      'List the articles in this llms.txt section (exact match). Omit both arguments to ' +
        'see the available section names.',
    ),
  query: z
    .string()
    .optional()
    .describe(
      'Full-text search terms. Prefer the two or three most distinctive words for the ' +
        'topic over a whole sentence, since common words match most articles and blur the ' +
        'ranking. At most 20 results come back and there is no paging, so narrow the terms ' +
        'rather than expecting to page.',
    ),
});
export type DocsListInput = z.infer<typeof DocsListSchema>;

export function createDocsListTool(_clients?: ToolClients) {
  return defineTool({
    name: 'docs_list',
    description:
      'List or full-text search Transcend documentation. With query, ranks articles by title ' +
      'and body and returns snippets; with section alone, lists that section; with neither, ' +
      'returns the section names. Pick the best matching url, then call docs_fetch.',
    category: 'Documentation',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: DocsListSchema,
    handler: async ({ section, query }) => {
      // A blank query still means the caller meant to search. Falling through to
      // the section overview would answer a search with a browse and report success.
      if (query !== undefined && query.trim() === '') {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          'query was empty. Pass the most distinctive terms for the topic, or omit query ' +
            'entirely to browse the sections.',
        );
      }

      const entries = await getIndex();
      const sectionCounts = groupBy(entries, 'section');

      // Section is an exact match, so a near-miss would otherwise come back as
      // an empty list that looks like "no such articles" rather than a typo.
      if (section !== undefined && !Object.hasOwn(sectionCounts, section)) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          `Unknown section '${section}'. Valid sections: ${Object.keys(sectionCounts).join(', ')}.`,
        );
      }

      const terms = query?.trim();
      if (terms) {
        const { hits, totalCount } = await searchDocs(terms, { section });
        return createListResult(hits, {
          totalCount,
          ...(totalCount > hits.length && {
            paginationNote:
              `Showing the ${hits.length} highest-ranked of ${totalCount} matches. There is ` +
              'no paging: use more distinctive terms to narrow the search.',
          }),
        });
      }

      if (section === undefined) {
        return createListResult(
          Object.entries(sectionCounts).map(([name, articleCount]) => ({
            section: name,
            articleCount,
          })),
          {
            paginationNote:
              'Sections only. Call docs_list again with section to list its articles, or ' +
              `with query to search all ${entries.length} articles.`,
          },
        );
      }

      const filtered = entries.filter((entry) => entry.section === section);
      const page = filtered.slice(0, SECTION_LISTING_LIMIT);
      return createListResult(
        page.map(({ title, section: entrySection, url }) => ({
          title,
          section: entrySection,
          url,
        })),
        {
          totalCount: filtered.length,
          ...(filtered.length > page.length && {
            paginationNote:
              `Showing ${page.length} of ${filtered.length} articles in '${section}'. There ` +
              'is no paging: add query to search within this section.',
          }),
        },
      );
    },
  });
}
