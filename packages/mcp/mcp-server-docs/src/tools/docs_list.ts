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
import {
  DashboardDocsProduct,
  findProductKey,
  findProductTitle,
  lookupRoute,
  normalizeDocUrl,
  normalizeRoute,
  resolveRouteProduct,
  type RoutePage,
} from '../docsRoutes.js';
import { searchDocs } from '../docsSearch.js';

/**
 * Cap on articles returned when listing a section. A listing entry is a title
 * and a URL, roughly a fifth the size of a ranked hit with its snippet, so this
 * sits above the search limit; the largest section would otherwise return 125
 * articles and ~22KB.
 */
const SECTION_LISTING_LIMIT = 50;

const dashboardDocsProductTitles = Object.values(DashboardDocsProduct);

export const DashboardDocsProductSchema = z.preprocess(
  (value) => (typeof value === 'string' ? findProductTitle(value) : value),
  z.nativeEnum(DashboardDocsProduct, {
    message: `Unknown product. Valid products: ${dashboardDocsProductTitles.join(', ')}.`,
  }),
);

export const DocsListSchema = z.object({
  route: z
    .string()
    .optional()
    .describe(
      'Find docs for an Admin Dashboard page. Accepts a route pattern ' +
        "('/privacy-center/general-settings'), a concrete path " +
        "('/privacy-center/general-settings/deployment'), or a full app URL " +
        "('https://app.transcend.io/privacy-center/general-settings?tab=x'). Returns pages " +
        'about that page first, then pages that only link to it, then more docs for the ' +
        "page's product. Combine with query to append full-text results. Cannot be combined " +
        'with section or product.',
    ),
  product: DashboardDocsProductSchema.optional().describe(
    `List docs for one Transcend dashboard product, overview pages first. One of: ${dashboardDocsProductTitles.join(', ')} ` +
      '(case-insensitive). Platform covers admin, infrastructure, prompts, and action items. Combine with query to search only within that product. Cannot be combined with ' +
      'section or route.',
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

/** Cap on product pages added after the route's own pages. */
const ROUTE_PRODUCT_LIMIT = 10;
/** Cap on pages returned when listing one product. */
const PRODUCT_LISTING_LIMIT = 50;
/** Cap on total rows when a route lookup is combined with a query. */
const COMBINED_LIMIT = 20;

function throwRouteIndexError(error: unknown): never {
  if (error instanceof RouteIndexUnavailableError) {
    throw new ToolError(
      ErrorCode.API_ERROR,
      `${error.message}. Use query to search the docs instead.`,
    );
  }
  throw error;
}

function toProductRows(pages: RoutePage[], product: string) {
  return pages.map((page) => ({ ...page, match: 'product' as const, product }));
}

async function listDocsByProduct({
  product,
  query,
}: {
  /** Canonical dashboard product title. */
  product: DashboardDocsProduct;
  /** Optional full-text terms to search within the product. */
  query?: string;
}) {
  const title = findProductTitle(product);
  if (!title) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      `Unknown product '${product}'. Valid products: ${dashboardDocsProductTitles.join(', ')}.`,
    );
  }

  let data;
  try {
    data = await getRouteIndex();
  } catch (error) {
    return throwRouteIndexError(error);
  }
  if (!data.products) {
    throw new ToolError(
      ErrorCode.API_ERROR,
      'The docs index has no product data, so product is not available. Use query to ' +
        'search the docs instead.',
    );
  }

  const key = findProductKey(data.products, title);
  const pages = key ? (data.products[key] ?? []) : [];

  const terms = query?.trim();
  if (terms) {
    const inProduct = new Set(pages.map((page) => normalizeDocUrl(page.url)));
    const { hits, totalCount } = await searchDocs(terms, {
      urlFilter: (url) => inProduct.has(normalizeDocUrl(url)),
    });
    return createListResult(
      hits.map((hit) => ({ match: 'search' as const, ...hit })),
      {
        totalCount,
        paginationNote:
          `Search results limited to ${title} docs.` +
          (totalCount > hits.length
            ? ` Showing the ${hits.length} highest-ranked of ${totalCount} matches. Use more ` +
              'distinctive terms to narrow the search.'
            : ''),
      },
    );
  }

  const page = pages.slice(0, PRODUCT_LISTING_LIMIT);
  return createListResult(toProductRows(page, title), {
    totalCount: pages.length,
    paginationNote:
      pages.length === 0
        ? `No ${title} pages are published yet. Use query to search the docs instead.`
        : pages.length > page.length
          ? `Showing ${page.length} of ${pages.length} ${title} pages, overview pages first. ` +
            'There is no paging: add query with product to search within them.'
          : `${title} pages, overview pages first.`,
  });
}

async function listDocsForRoute({ route, query }: { route: string; query?: string }) {
  let path: string;
  try {
    path = normalizeRoute(route);
  } catch (error) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      error instanceof Error ? error.message : String(error),
    );
  }

  let data;
  try {
    data = await getRouteIndex();
  } catch (error) {
    return throwRouteIndexError(error);
  }

  const lookup = lookupRoute(data.routes, path);
  const tier1 = lookup?.pages ?? [];

  // Tier 2: pages for the route's product, minus anything tier 1 already has.
  const productTitle = resolveRouteProduct(data, path, lookup);
  const productKey =
    productTitle && data.products ? findProductKey(data.products, productTitle) : undefined;
  const seen = new Set(tier1.map((page) => normalizeDocUrl(page.url)));
  const tier2 =
    productKey && data.products
      ? toProductRows(
          (data.products[productKey] ?? []).filter((page) => !seen.has(normalizeDocUrl(page.url))),
          productKey,
        ).slice(0, ROUTE_PRODUCT_LIMIT)
      : [];

  const notes: string[] = [];
  if (lookup?.isParentFallback) {
    notes.push(
      `No docs are linked to '${path}'. Showing docs for its parent route '${lookup.pattern}'.`,
    );
  } else if (lookup) {
    notes.push(
      `Docs for route '${lookup.pattern}'. Pages with match 'primary' are about this page; ` +
        "'mention' pages only link to it.",
    );
  } else if (tier2.length > 0) {
    notes.push(`No docs are linked to '${path}' or its parent paths.`);
  }
  if (tier2.length > 0) {
    notes.push(
      tier1.length > 0
        ? `Pages with match 'product' are more ${productKey} docs.`
        : `Showing ${productKey} product docs instead.`,
    );
  }

  const terms = query?.trim();
  if (!terms) {
    const rows = [...tier1, ...tier2];
    if (rows.length === 0) {
      return createListResult([], {
        totalCount: 0,
        paginationNote:
          `No docs are linked to '${path}' or its parent paths. Use query to search the docs ` +
          'instead.',
      });
    }
    return createListResult(rows, { totalCount: rows.length, paginationNote: notes.join(' ') });
  }

  // Tier 3: full-text search, skipping pages already listed, within the total cap.
  const lead = [...tier1, ...tier2].slice(0, COMBINED_LIMIT);
  const listed = new Set(lead.map((page) => normalizeDocUrl(page.url)));
  const remaining = COMBINED_LIMIT - lead.length;
  const { hits } =
    remaining > 0
      ? await searchDocs(terms, {
          limit: remaining,
          urlFilter: (url) => !listed.has(normalizeDocUrl(url)),
        })
      : { hits: [] };
  const rows = [...lead, ...hits.map((hit) => ({ match: 'search' as const, ...hit }))];
  notes.push(`Pages with match 'search' are full-text results for '${terms}'.`);
  return createListResult(rows, { totalCount: rows.length, paginationNote: notes.join(' ') });
}

export function createDocsListTool(_clients?: ToolClients) {
  return defineTool({
    name: 'docs_list',
    description:
      'List or full-text search Transcend documentation. Pick the narrowest argument you ' +
      'can: use route when you know the Admin Dashboard page the user is on ("this page"); ' +
      "it returns that page's docs, then more docs for its product. Otherwise use product " +
      'when you know the product area. Otherwise use query, which ranks articles by title ' +
      'and body and returns snippets. route and product can each be combined with query. ' +
      'section alone lists one llms.txt section; with no arguments the tool returns the ' +
      'section names. Pick the best matching url, then call docs_fetch.',
    category: 'Documentation',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: DocsListSchema,
    handler: async ({ section, query, route, product }) => {
      if (section !== undefined && (route !== undefined || product !== undefined)) {
        const other = route !== undefined ? 'route' : 'product';
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          `${other} cannot be combined with section. Pass ${other} alone or with query to find ` +
            'docs for a page or product, or drop it to browse a section.',
        );
      }
      if (route !== undefined && product !== undefined) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          'route cannot be combined with product. A route already resolves to its product: ' +
            'pass route, or pass product to list that product directly.',
        );
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

      if (route !== undefined) {
        return listDocsForRoute({ route, query });
      }
      if (product !== undefined) {
        return listDocsByProduct({ product, query });
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
