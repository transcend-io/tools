import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DASHBOARD_ROUTES_URL,
  getRouteIndex,
  LLMS_TXT_URL,
  parseDashboardRoutes,
  resetDocsCachesForTests,
  RouteIndexUnavailableError,
} from '../src/docsIndex.js';
import { createDocsListTool } from '../src/tools/docs_list.js';

const LLMS_TXT = [
  '## General',
  '- [DSR Automation](https://docs.transcend.io/docs/dsr.md)',
  '## Privacy Center',
  '- [Saving and publishing to the Privacy Center](https://docs.transcend.io/docs/privacy-center/saving.md)',
  '- [Custom domains for the Privacy Center](https://docs.transcend.io/docs/privacy-center/domains.md)',
  '- [Consent banner domains](https://docs.transcend.io/docs/consent/banner.md)',
  '',
].join('\n');

const page = (title: string, path: string, guideType: string | null = null) => ({
  title,
  url: `https://docs.transcend.io/docs/${path}`,
  guideType,
});

const OVERVIEW = page('Privacy Center overview', 'privacy-center/overview', 'Overviews & Concepts');
const SAVING = page(
  'Saving and publishing to the Privacy Center',
  'privacy-center/saving',
  'Overviews & Concepts',
);
const DOMAINS = page('Custom domains for the Privacy Center', 'privacy-center/domains');

const PRODUCT_PAGES = [OVERVIEW, SAVING, DOMAINS];

const ROUTES_WITH_PRODUCTS_JSON = JSON.stringify({
  routes: {
    '/privacy-center/general-settings': {
      product: 'Privacy Center',
      primary: [SAVING],
      mentions: [page('Consent setup', 'consent/setup')],
    },
    '/settings/sso': { product: null, primary: [page('SSO', 'settings/sso')], mentions: [] },
  },
  products: { 'Privacy Center': PRODUCT_PAGES },
  productPrefixes: [
    { prefix: '/privacy-center', product: 'Privacy Center' },
    { prefix: '/settings', product: null },
  ],
});

const ADMIN_USERS = page('Managing users', 'admin/users');
const ADMIN_OVERVIEW = page('Platform overview', 'admin/overview', 'Overviews & Concepts');

const platformJson = (platformPages: Array<ReturnType<typeof page>>) =>
  JSON.stringify({
    routes: {
      '/admin/users': { product: 'Platform', primary: [ADMIN_USERS], mentions: [] },
    },
    products: { 'Privacy Center': PRODUCT_PAGES, Platform: platformPages },
    productPrefixes: [
      { prefix: '/admin', product: 'Platform' },
      { prefix: '/privacy-center', product: 'Privacy Center' },
    ],
  });

const ROUTES_JSON = JSON.stringify({
  routes: {
    '/privacy-center/general-settings': {
      primary: [
        {
          title: 'Saving and publishing to the Privacy Center',
          url: 'https://docs.transcend.io/docs/privacy-center/saving',
          guideType: 'Overviews & Concepts',
        },
      ],
      mentions: [
        {
          title: 'Consent setup',
          url: 'https://docs.transcend.io/docs/consent/setup',
          guideType: null,
        },
      ],
    },
  },
});

type ListResult = {
  data: Array<{
    title: string;
    url: string;
    guideType: string | null;
    match: string;
    route: string;
  }>;
  count: number;
  paginationNote: string;
};

function mockFetch(routes: () => Response): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url === DASHBOARD_ROUTES_URL) {
      return routes();
    }
    if (url === LLMS_TXT_URL) {
      return new Response(LLMS_TXT, { status: 200 });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

afterEach(() => {
  resetDocsCachesForTests();
  vi.restoreAllMocks();
});

describe('parseDashboardRoutes', () => {
  it('defaults missing arrays and null guide types', () => {
    expect(
      parseDashboardRoutes(
        JSON.stringify({
          routes: { '/a': { primary: [{ title: 'A', url: 'https://docs.transcend.io/a' }] } },
        }),
      ).routes,
    ).toEqual({
      '/a': {
        primary: [{ title: 'A', url: 'https://docs.transcend.io/a', guideType: null }],
        mentions: [],
      },
    });
  });

  it('parses an index with only routes and leaves product fields absent', () => {
    const data = parseDashboardRoutes(ROUTES_JSON);
    expect(data.products).toBeUndefined();
    expect(data.productPrefixes).toBeUndefined();
  });

  it('parses product fields when present', () => {
    const data = parseDashboardRoutes(ROUTES_WITH_PRODUCTS_JSON);
    expect(data.routes['/privacy-center/general-settings']?.product).toBe('Privacy Center');
    expect(data.products?.['Privacy Center']).toHaveLength(3);
    expect(data.productPrefixes?.[1]).toEqual({ prefix: '/settings', product: null });
  });

  it('rejects an invalid shape', () => {
    expect(() => parseDashboardRoutes('{"routes":{"/a":{"primary":[{"title":1}]}}}')).toThrow();
    expect(() => parseDashboardRoutes('{}')).toThrow();
  });
});

describe('getRouteIndex', () => {
  it('fetches once and serves later calls from cache', async () => {
    const fetchMock = mockFetch(() => new Response(ROUTES_JSON, { status: 200 }));
    await getRouteIndex();
    await getRouteIndex();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws RouteIndexUnavailableError on 404', async () => {
    mockFetch(() => new Response('nope', { status: 404 }));
    await expect(getRouteIndex()).rejects.toBeInstanceOf(RouteIndexUnavailableError);
  });

  it('throws RouteIndexUnavailableError on invalid JSON', async () => {
    mockFetch(() => new Response('{"routes": []}', { status: 200 }));
    await expect(getRouteIndex()).rejects.toBeInstanceOf(RouteIndexUnavailableError);
  });
});

describe('docs_list route', () => {
  it('returns primary pages then mentions for an app URL', async () => {
    mockFetch(() => new Response(ROUTES_JSON, { status: 200 }));
    const tool = createDocsListTool();
    const result = (await tool.handler({
      route: 'https://app.transcend.io/privacy-center/general-settings?tab=x',
    })) as ListResult;

    expect(result.data).toEqual([
      {
        title: 'Saving and publishing to the Privacy Center',
        url: 'https://docs.transcend.io/docs/privacy-center/saving',
        guideType: 'Overviews & Concepts',
        match: 'primary',
        route: '/privacy-center/general-settings',
      },
      {
        title: 'Consent setup',
        url: 'https://docs.transcend.io/docs/consent/setup',
        guideType: null,
        match: 'mention',
        route: '/privacy-center/general-settings',
      },
    ]);
  });

  it('falls back to the parent route and says so', async () => {
    mockFetch(() => new Response(ROUTES_JSON, { status: 200 }));
    const tool = createDocsListTool();
    const result = (await tool.handler({
      route: '/privacy-center/general-settings/deployment',
    })) as ListResult;

    expect(result.count).toBe(2);
    expect(result.paginationNote).toContain('parent route');
  });

  it('returns an empty list with a hint when nothing matches', async () => {
    mockFetch(() => new Response(ROUTES_JSON, { status: 200 }));
    const tool = createDocsListTool();
    const result = (await tool.handler({ route: '/unknown/page' })) as ListResult;

    expect(result.count).toBe(0);
    expect(result.paginationNote).toContain('query');
  });

  it('throws a clear error when the route index is not available', async () => {
    mockFetch(() => new Response('nope', { status: 404 }));
    const tool = createDocsListTool();
    await expect(tool.handler({ route: '/privacy-center/general-settings' })).rejects.toThrow(
      /route index is not available/,
    );
  });

  it('keeps query and section working when the route index is not available', async () => {
    mockFetch(() => new Response('nope', { status: 404 }));
    const tool = createDocsListTool();
    const result = (await tool.handler({ section: 'General' })) as ListResult;
    expect(result.count).toBe(1);
  });

  it('keeps section exclusive with route and product and names the conflict', async () => {
    mockFetch(() => new Response(ROUTES_WITH_PRODUCTS_JSON, { status: 200 }));
    const tool = createDocsListTool();
    await expect(tool.handler({ route: '/a', section: 'General' })).rejects.toThrow(
      /route cannot be combined with section/,
    );
    await expect(tool.handler({ product: 'Privacy Center', section: 'General' })).rejects.toThrow(
      /product cannot be combined with section/,
    );
    await expect(tool.handler({ route: '/a', product: 'Privacy Center' })).rejects.toThrow(
      /route cannot be combined with product/,
    );
  });

  it('rejects a URL that is not an app dashboard URL', async () => {
    mockFetch(() => new Response(ROUTES_JSON, { status: 200 }));
    const tool = createDocsListTool();
    await expect(tool.handler({ route: 'https://evil.example.com/x' })).rejects.toThrow(
      /app\.transcend\.io/,
    );
  });
});

describe('docs_list tiers', () => {
  const withProducts = () =>
    mockFetch(() => new Response(ROUTES_WITH_PRODUCTS_JSON, { status: 200 }));
  const matches = (result: ListResult) => result.data.map((row) => [row.match, row.title]);

  it('route alone returns pages, then mentions, then product pages without duplicates', async () => {
    withProducts();
    const result = (await createDocsListTool().handler({
      route: '/privacy-center/general-settings',
    })) as ListResult;

    expect(matches(result)).toEqual([
      ['primary', SAVING.title],
      ['mention', 'Consent setup'],
      ['product', OVERVIEW.title],
      ['product', DOMAINS.title],
    ]);
    expect(result.data[2]?.product).toBe('Privacy Center');
  });

  it('caps product pages at 10 after the route pages', async () => {
    const many = Array.from({ length: 15 }, (_, i) => page(`Page ${i}`, `privacy-center/p-${i}`));
    mockFetch(
      () =>
        new Response(
          JSON.stringify({
            routes: {},
            products: { 'Privacy Center': many },
            productPrefixes: [{ prefix: '/privacy-center', product: 'Privacy Center' }],
          }),
          { status: 200 },
        ),
    );
    const result = (await createDocsListTool().handler({
      route: '/privacy-center/anything',
    })) as ListResult;

    expect(result.count).toBe(10);
    expect(result.data.every((row) => row.match === 'product')).toBe(true);
  });

  it('returns product pages and says so when the route has no pages', async () => {
    withProducts();
    const result = (await createDocsListTool().handler({
      route: 'https://app.transcend.io/privacy-center/unknown-tab?x=1',
    })) as ListResult;

    expect(result.data.map((row) => row.match)).toEqual(['product', 'product', 'product']);
    expect(result.paginationNote).toContain('product docs instead');
  });

  it('keeps the parent route fallback for tier 1 and still adds product pages', async () => {
    withProducts();
    const result = (await createDocsListTool().handler({
      route: '/privacy-center/general-settings/deployment',
    })) as ListResult;

    expect(result.data[0]?.match).toBe('primary');
    expect(result.paginationNote).toContain('parent route');
    expect(result.data.some((row) => row.match === 'product')).toBe(true);
  });

  it('adds no product pages for a platform route', async () => {
    withProducts();
    const result = (await createDocsListTool().handler({ route: '/settings/sso' })) as ListResult;

    expect(matches(result)).toEqual([['primary', 'SSO']]);
    const none = (await createDocsListTool().handler({ route: '/settings/other' })) as ListResult;
    expect(none.count).toBe(0);
  });

  it('product alone lists that product with overview pages first, case-insensitively', async () => {
    withProducts();
    const result = (await createDocsListTool().handler({
      product: 'privacy CENTER',
    })) as ListResult;

    expect(matches(result)).toEqual([
      ['product', OVERVIEW.title],
      ['product', SAVING.title],
      ['product', DOMAINS.title],
    ]);
  });

  it('product alone caps at 50 and says what was withheld', async () => {
    const many = Array.from({ length: 60 }, (_, i) => page(`Page ${i}`, `privacy-center/p-${i}`));
    mockFetch(
      () =>
        new Response(JSON.stringify({ routes: {}, products: { 'Privacy Center': many } }), {
          status: 200,
        }),
    );
    const result = (await createDocsListTool().handler({
      product: 'Privacy Center',
    })) as ListResult & {
      totalCount: number;
    };

    expect(result.count).toBe(50);
    expect(result.totalCount).toBe(60);
    expect(result.paginationNote).toContain('50 of 60');
  });

  it('query alone is unchanged and carries no match field', async () => {
    withProducts();
    const result = (await createDocsListTool().handler({ query: 'domains' })) as ListResult;

    expect(result.count).toBe(2);
    expect(result.data.every((row) => row.match === undefined)).toBe(true);
  });

  it('product plus query only returns hits inside the product', async () => {
    withProducts();
    const result = (await createDocsListTool().handler({
      product: 'Privacy Center',
      query: 'domains',
    })) as ListResult;

    expect(result.data.map((row) => row.title)).toEqual([DOMAINS.title]);
    expect(result.data[0]?.match).toBe('search');
  });

  it('route plus query lists tiers first, then deduped search results', async () => {
    withProducts();
    const result = (await createDocsListTool().handler({
      route: '/privacy-center/general-settings',
      query: 'domains',
    })) as ListResult;

    expect(matches(result)).toEqual([
      ['primary', SAVING.title],
      ['mention', 'Consent setup'],
      ['product', OVERVIEW.title],
      ['product', DOMAINS.title],
      ['search', 'Consent banner domains'],
    ]);
    const urls = result.data.map((row) => row.url.replace(/\.md$/, ''));
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('route plus query returns search results when the route has nothing', async () => {
    withProducts();
    const result = (await createDocsListTool().handler({
      route: '/settings/other',
      query: 'domains',
    })) as ListResult;

    expect(result.data.every((row) => row.match === 'search')).toBe(true);
    expect(result.count).toBe(2);
  });

  it('caps route plus query at 20 rows total', async () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      page(`Domains ${i}`, `privacy-center/p-${i}`),
    );
    const llms = [
      '## General',
      ...Array.from(
        { length: 30 },
        (_, i) => `- [Domains guide ${i}](https://docs.transcend.io/docs/other/d-${i}.md)`,
      ),
    ].join('\n');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === DASHBOARD_ROUTES_URL) {
        return new Response(
          JSON.stringify({
            routes: {
              '/pc': { product: 'Privacy Center', primary: many.slice(0, 5), mentions: [] },
            },
            products: { 'Privacy Center': many },
          }),
          { status: 200 },
        );
      }
      if (url === LLMS_TXT_URL) {
        return new Response(llms, { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = (await createDocsListTool().handler({
      route: '/pc',
      query: 'domains',
    })) as ListResult;
    expect(result.count).toBe(20);
    expect(result.data.slice(0, 5).every((row) => row.match === 'primary')).toBe(true);
    expect(result.data.slice(5, 15).every((row) => row.match === 'product')).toBe(true);
    expect(result.data.slice(15).every((row) => row.match === 'search')).toBe(true);
  });

  it('rejects an unknown product and lists the valid titles', async () => {
    withProducts();
    await expect(createDocsListTool().handler({ product: 'Billing' })).rejects.toThrow(
      /Unknown product 'Billing'\. Valid products: Data Inventory, System Discovery, .*Assessments, Platform\./,
    );
  });

  it('works against an index with only routes: route as before, product errors', async () => {
    mockFetch(() => new Response(ROUTES_JSON, { status: 200 }));
    const tool = createDocsListTool();
    const result = (await tool.handler({
      route: '/privacy-center/general-settings',
    })) as ListResult;
    expect(result.data.map((row) => row.match)).toEqual(['primary', 'mention']);

    await expect(tool.handler({ product: 'Privacy Center' })).rejects.toThrow(
      /no product data.*Use query/,
    );
  });

  it('reports an unavailable index for product lookups', async () => {
    mockFetch(() => new Response('nope', { status: 404 }));
    await expect(createDocsListTool().handler({ product: 'Privacy Center' })).rejects.toThrow(
      /route index is not available/,
    );
  });

  it('resolves /admin/users to Platform and returns tier 1 plus a small product tier', async () => {
    mockFetch(() => new Response(platformJson([ADMIN_OVERVIEW, ADMIN_USERS]), { status: 200 }));
    const result = (await createDocsListTool().handler({ route: '/admin/users' })) as ListResult;

    expect(matches(result)).toEqual([
      ['primary', ADMIN_USERS.title],
      ['product', ADMIN_OVERVIEW.title],
    ]);
    expect(result.data[1]?.product).toBe('Platform');
  });

  it('returns only tier 1 for a Platform route when the Platform product list is empty', async () => {
    mockFetch(() => new Response(platformJson([]), { status: 200 }));
    const result = (await createDocsListTool().handler({ route: '/admin/users' })) as ListResult;

    expect(matches(result)).toEqual([['primary', ADMIN_USERS.title]]);
  });

  it('accepts product Platform in any case and returns its pages', async () => {
    mockFetch(() => new Response(platformJson([ADMIN_OVERVIEW, ADMIN_USERS]), { status: 200 }));
    const result = (await createDocsListTool().handler({ product: 'platform' })) as ListResult;

    expect(matches(result)).toEqual([
      ['product', ADMIN_OVERVIEW.title],
      ['product', ADMIN_USERS.title],
    ]);
  });

  it('accepts product Platform with no pages and says so', async () => {
    mockFetch(() => new Response(platformJson([]), { status: 200 }));
    const result = (await createDocsListTool().handler({ product: 'Platform' })) as ListResult;

    expect(result.count).toBe(0);
    expect(result.paginationNote).toContain('No Platform pages are published yet');
    expect(result.paginationNote).toContain('query');
  });

  it('lists Platform in the product argument description', () => {
    const shape = createDocsListTool().zodSchema.shape.product;
    expect(shape.description).toContain('Platform');
  });
});
