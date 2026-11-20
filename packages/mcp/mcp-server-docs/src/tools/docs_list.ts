import {
  createListResult,
  defineTool,
  ErrorCode,
  getRequestAuth,
  groupBy,
  ToolError,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import {
  DocsGuideType,
  DocsListRouteMatch,
  DocsLookupSource,
  DocsPersona,
  DocsProduct,
} from '@transcend-io/privacy-types';

import { getIndex, getRouteIndex, RouteIndexUnavailableError } from '../docsIndex.js';
import {
  findIntegrationKey,
  findProductKey,
  findProductTitle,
  integrationGuidePages,
  lookupRoute,
  normalizeDocUrl,
  normalizeRoute,
  primaryAppUrlForDoc,
  resolveRouteProduct,
  toDashboardLink,
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

const docsProductTitles = Object.values(DocsProduct);
const docsProductEnumValues = docsProductTitles as [DocsProduct, ...DocsProduct[]];
const docsGuideTypeTitles = Object.values(DocsGuideType) as [DocsGuideType, ...DocsGuideType[]];
const docsPersonaTitles = Object.values(DocsPersona) as [DocsPersona, ...DocsPersona[]];
const docsLookupSourceValues = Object.values(DocsLookupSource) as [
  DocsLookupSource,
  ...DocsLookupSource[],
];

export const DocsGuideTypeSchema = z.enum(docsGuideTypeTitles, {
  message: `Unknown guideType. Valid guide types: ${docsGuideTypeTitles.join(', ')}.`,
});

export const DocsPersonaSchema = z.enum(docsPersonaTitles, {
  message: `Unknown persona. Valid personas: ${docsPersonaTitles.join(', ')}.`,
});

export const DocsLookupSourceSchema = z.enum(docsLookupSourceValues, {
  message: `Unknown source. Valid sources: ${docsLookupSourceValues.join(', ')}.`,
});

export const DocsProductSchema = z.preprocess(
  (value) => (typeof value === 'string' ? findProductTitle(value) : value),
  z.enum(docsProductEnumValues, {
    message: `Unknown product. Valid products: ${docsProductTitles.join(', ')}.`,
  }),
);

export const DocsListSchema = z.object({
  route: z
    .string()
    .optional()
    .describe(
      'Admin Dashboard route pattern, path, or app URL. Returns linked pages, then product ' +
        'docs. Combine with query. Not with section or product.',
    ),
  product: DocsProductSchema.optional().describe(
    `List docs for one product, overview pages first. One of: ${docsProductTitles.join(', ')} ` +
      '(case-insensitive). Can combine with query. Not with section or route.',
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
      'Full-text search terms (prefer 2–3 distinctive words). At most 20 results; no paging.',
    ),
  integration: z
    .string()
    .optional()
    .describe(
      'Public integration guides for this catalog integrationName. Catalog depth needs ' +
        'docs_integration_lookup when signed in.',
    ),
});
export type DocsListInput = z.infer<typeof DocsListSchema>;

/** Cap on product pages added after the route's own pages. */
const ROUTE_PRODUCT_LIMIT = 10;
/** Cap on pages returned when listing one product. */
const PRODUCT_LISTING_LIMIT = 50;
/** Cap on rows when a route lookup has no query. */
const ROUTE_LISTING_LIMIT = 30;
/** Cap on total rows when a route lookup is combined with a query. */
const COMBINED_LIMIT = 20;
/** Rows kept for full-text results when a route lookup is combined with a query. */
const SEARCH_RESERVE = 8;
/** Cap on product pages when a route lookup is combined with a query. */
const ROUTE_PRODUCT_LIMIT_WITH_QUERY = 5;

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
  return pages.map((page) => ({
    ...page,
    match: DocsListRouteMatch.Product,
    product,
  }));
}

/**
 * Adds the one-line llms.txt summary to each row, matched by URL. Route and product
 * rows come from dashboard-routes.json, which has no summaries. A missing or failed
 * llms.txt index leaves the rows as they were, since the summary is a convenience.
 */
function withAppUrl<T extends { url: string; route?: string }>(
  data: Awaited<ReturnType<typeof getRouteIndex>>,
  rows: T[],
): Array<T & { appUrl?: string }> {
  return rows.map((row) => {
    if (typeof row.route === 'string') {
      const link = toDashboardLink(row.route);
      if (link.url) {
        return { ...row, appUrl: link.url };
      }
    }
    const fromDoc = primaryAppUrlForDoc(data, row.url);
    return fromDoc ? { ...row, appUrl: fromDoc } : row;
  });
}

async function enrichRowsWithAppUrl<T extends { url: string }>(
  rows: T[],
): Promise<Array<T & { appUrl?: string }>> {
  try {
    return withAppUrl(await getRouteIndex(), rows);
  } catch {
    return rows;
  }
}

async function withDescriptions<T extends { url: string }>(
  rows: T[],
): Promise<Array<T & { description?: string }>> {
  let entries;
  try {
    entries = await getIndex();
  } catch {
    return rows;
  }
  const byUrl = new Map<string, string>();
  for (const entry of entries) {
    if (entry.description) {
      byUrl.set(normalizeDocUrl(entry.url), entry.description);
    }
  }
  return rows.map((row) => {
    const description = byUrl.get(normalizeDocUrl(row.url));
    return description ? { ...row, description } : row;
  });
}

async function listDocsByProduct({
  product,
  query,
}: {
  /** Canonical dashboard product title. */
  product: DocsProduct;
  /** Optional full-text terms to search within the product. */
  query?: string;
}) {
  const title = findProductTitle(product);
  if (!title) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      `Unknown product '${product}'. Valid products: ${docsProductTitles.join(', ')}.`,
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
      withAppUrl(
        data,
        await withDescriptions(hits.map((hit) => ({ match: DocsListRouteMatch.Search, ...hit }))),
      ),
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
  return createListResult(withAppUrl(data, await withDescriptions(toProductRows(page, title))), {
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
    // The busiest route has 76 linked pages today, so cap the listing. Primary pages
    // come first, so a cut drops mentions and product pages before pages about the route.
    const page = rows.slice(0, ROUTE_LISTING_LIMIT);
    if (rows.length > page.length) {
      notes.push(
        `Showing the first ${page.length} of ${rows.length} pages, primary pages first. ` +
          'There is no paging: add query to search within them.',
      );
    }
    return createListResult(withAppUrl(data, await withDescriptions(page)), {
      totalCount: rows.length,
      paginationNote: notes.join(' '),
    });
  }

  // Tier 3: full-text search, skipping pages already listed, within the total cap.
  // Route pages are not otherwise capped, and a busy route has 76 linked pages today.
  // Reserve rows for search so the caller's query is never answered with route pages alone.
  const tier2WithQuery = tier2.slice(0, ROUTE_PRODUCT_LIMIT_WITH_QUERY);
  const leadLimit = COMBINED_LIMIT - SEARCH_RESERVE;
  const lead = [...tier1, ...tier2WithQuery].slice(0, leadLimit);
  const leadTotal = tier1.length + tier2WithQuery.length;
  if (leadTotal > lead.length) {
    notes.push(
      `Showing ${lead.length} of ${leadTotal} route and product pages to leave room for search results.`,
    );
  }
  const listed = new Set(lead.map((page) => normalizeDocUrl(page.url)));
  const remaining = COMBINED_LIMIT - lead.length;
  const { hits } =
    remaining > 0
      ? await searchDocs(terms, {
          limit: remaining,
          urlFilter: (url) => !listed.has(normalizeDocUrl(url)),
        })
      : { hits: [] };
  const rows = [...lead, ...hits.map((hit) => ({ match: DocsListRouteMatch.Search, ...hit }))];
  if (hits.length > 0) {
    notes.push(`Pages with match 'search' are full-text results for '${terms}'.`);
  } else {
    notes.push(`No full-text results for '${terms}' beyond the pages above.`);
  }
  return createListResult(withAppUrl(data, await withDescriptions(rows)), {
    totalCount: rows.length,
    paginationNote: notes.join(' '),
  });
}

export function createDocsListTool(_clients?: ToolClients) {
  return defineTool({
    name: 'docs_list',
    description:
      'List or search Transcend documentation. Prefer route for a Dashboard page, product ' +
      'for a product area, or query for full-text search. Rows may include a one-line index ' +
      'description and appUrl when mapped. section lists one llms.txt section; omit arguments for section names. ' +
      'Then call docs_fetch with a url.',
    category: 'Documentation',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: DocsListSchema,
    handler: async ({ section, query, route, product, integration }) => {
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
      if (
        integration !== undefined &&
        (route !== undefined || product !== undefined || section !== undefined)
      ) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          'integration cannot be combined with route, product, or section. Pass integration ' +
            'alone or with query to list public integration guides.',
        );
      }

      // A blank route would look up `/`, which has no docs, and report an empty success.
      if (route !== undefined && route.trim() === '') {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          'route was empty. Pass an Admin Dashboard route pattern, path, or app URL, or omit ' +
            'route.',
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
      const integrationName = integration?.trim();
      if (integrationName !== undefined && integrationName.length === 0) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          'integration was empty. Pass a catalog integrationName, or omit integration.',
        );
      }

      let integrationUrlSet: Set<string> | undefined;
      let integrationPages: RoutePage[] | undefined;
      if (integrationName !== undefined) {
        let routeData;
        try {
          routeData = await getRouteIndex();
        } catch (error) {
          throw new ToolError(
            ErrorCode.API_ERROR,
            `Could not load dashboard-routes.json (${error instanceof Error ? error.message : String(error)}). ` +
              'Use query without integration, or retry later.',
          );
        }
        if (!routeData.integrations) {
          throw new ToolError(
            ErrorCode.API_ERROR,
            'dashboard-routes.json does not include integrations yet (docs may not be deployed). ' +
              'Use query to search integration docs, or retry after docs deploy.',
          );
        }
        const key = findIntegrationKey(routeData.integrations, integrationName);
        if (!key) {
          const names = [...Object.keys(routeData.integrations)].sort();
          throw new ToolError(
            ErrorCode.VALIDATION_ERROR,
            `Unknown integrationName '${integrationName}'. Published names: ${names.join(', ')}.`,
          );
        }
        integrationPages = integrationGuidePages(routeData, integrationName);
        integrationUrlSet = new Set(integrationPages.map((page) => normalizeDocUrl(page.url)));
      }

      const integrationFilter = integrationUrlSet
        ? (entry: { url: string }) => integrationUrlSet!.has(normalizeDocUrl(entry.url))
        : undefined;
      const scopedEntries = integrationFilter ? entries.filter(integrationFilter) : entries;

      const signedInCatalogNote =
        integrationName !== undefined && !getRequestAuth()
          ? 'Sign in to Transcend MCP and call docs_integration_lookup with the same integration ' +
            'for connection steps, datapoints, and supported actions from the integration catalog.'
          : undefined;

      const sectionCounts = groupBy(scopedEntries, 'section');

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
        const filteredHits = integrationFilter
          ? hits.filter((hit) => integrationFilter(hit))
          : hits;
        const reportedTotal = integrationFilter ? filteredHits.length : totalCount;
        return createListResult(await enrichRowsWithAppUrl(await withDescriptions(filteredHits)), {
          totalCount: reportedTotal,
          ...(signedInCatalogNote && { paginationNote: signedInCatalogNote }),
          ...(!signedInCatalogNote &&
            totalCount > filteredHits.length && {
              paginationNote:
                `Showing the ${filteredHits.length} highest-ranked of ${totalCount} matches. There is ` +
                'no paging: use more distinctive terms to narrow the search.',
            }),
        });
      }

      if (integrationName !== undefined) {
        const rows = integrationPages!.map(({ title, url, guideType }) => ({
          title,
          section: guideType ?? 'Integration Guides',
          url,
        }));
        return createListResult(await enrichRowsWithAppUrl(await withDescriptions(rows)), {
          totalCount: rows.length,
          ...(signedInCatalogNote && { paginationNote: signedInCatalogNote }),
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
              `with query to search all ${scopedEntries.length} articles.`,
          },
        );
      }

      const filtered = scopedEntries.filter((entry) => entry.section === section);
      const page = filtered.slice(0, SECTION_LISTING_LIMIT);
      return createListResult(
        await enrichRowsWithAppUrl(
          await withDescriptions(
            page.map(({ title, section: entrySection, url, description }) => ({
              title,
              section: entrySection,
              url,
              ...(description && { description }),
            })),
          ),
        ),
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
