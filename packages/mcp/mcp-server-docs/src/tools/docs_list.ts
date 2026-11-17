import {
  createListResult,
  defineTool,
  ErrorCode,
  groupBy,
  ToolError,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import { getIndex, getRouteIndex, RouteIndexUnavailableError } from '../docsIndex.js';
import { lookupRoute, normalizeRoute } from '../docsRoutes.js';
import { searchDocs } from '../docsSearch.js';

/**
 * Cap on articles returned when listing a section. A listing entry is a title
 * and a URL, roughly a fifth the size of a ranked hit with its snippet, so this
 * sits above the search limit; the largest section would otherwise return 125
 * articles and ~22KB.
 */
const SECTION_LISTING_LIMIT = 50;

export const DocsListSchema = z.object({
  route: z
    .string()
    .optional()
    .describe(
      'Find docs for an Admin Dashboard page. Accepts a route pattern ' +
        "('/privacy-center/general-settings'), a concrete path " +
        "('/privacy-center/general-settings/deployment'), or a full app URL " +
        "('https://app.transcend.io/privacy-center/general-settings?tab=x'). Returns pages " +
        'about that page first, then pages that only link to it. Cannot be combined with ' +
        'query or section.',
    ),
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

async function listDocsForRoute({
  route,
  section,
  query,
}: Pick<DocsListInput, 'route' | 'section' | 'query'>) {
  const conflicts = [
    ...(section !== undefined ? ['section'] : []),
    ...(query !== undefined ? ['query'] : []),
  ];
  if (conflicts.length > 0) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      `route cannot be combined with ${conflicts.join(' or ')}. Pass route alone to find docs ` +
        'for a dashboard page, or drop route to search or browse.',
    );
  }

  let path: string;
  try {
    path = normalizeRoute(route ?? '');
  } catch (error) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      error instanceof Error ? error.message : String(error),
    );
  }

  let routeIndex;
  try {
    routeIndex = await getRouteIndex();
  } catch (error) {
    if (error instanceof RouteIndexUnavailableError) {
      throw new ToolError(
        ErrorCode.API_ERROR,
        `${error.message}. Use query to search the docs instead.`,
      );
    }
    throw error;
  }

  const lookup = lookupRoute(routeIndex, path);
  if (!lookup) {
    return createListResult([], {
      totalCount: 0,
      paginationNote:
        `No docs are linked to '${path}' or its parent paths. Use query to search the docs ` +
        'instead.',
    });
  }

  return createListResult(lookup.pages, {
    totalCount: lookup.pages.length,
    paginationNote: lookup.isParentFallback
      ? `No docs are linked to '${path}'. Showing docs for its parent route '${lookup.pattern}'.`
      : `Docs for route '${lookup.pattern}'. Pages with match 'primary' are about this page; ` +
        "'mention' pages only link to it.",
  });
}

export function createDocsListTool(_clients?: ToolClients) {
  return defineTool({
    name: 'docs_list',
    description:
      'List or full-text search Transcend documentation. With route, returns the docs for an ' +
      'Admin Dashboard page: use it first when the user is on a dashboard page and asks about ' +
      'it ("this page"). With query, ranks articles by title and body and returns snippets; ' +
      'with section alone, lists that section; with none of these, returns the section ' +
      'names. route cannot be combined with query or section. Pick the best matching url, ' +
      'then call docs_fetch.',
    category: 'Documentation',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: DocsListSchema,
    handler: async ({ section, query, route }) => {
      if (route !== undefined) {
        return listDocsForRoute({ route, section, query });
      }

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
